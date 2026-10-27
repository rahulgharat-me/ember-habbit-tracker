from collections.abc import Callable
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.services import github, notifier
from app.services.github import GitHubUser

STRANGER = GitHubUser(id=777, login="stranger", name="A Stranger", avatar_url=None)


@pytest.fixture
def invite_only(monkeypatch: pytest.MonkeyPatch) -> list:
    """Invite-only instance: alice is allowed, boss is the admin. Captures sent emails."""
    settings = get_settings()
    monkeypatch.setattr(settings, "allowed_github_users", "alice")
    monkeypatch.setattr(settings, "admin_github_users", "boss")
    monkeypatch.setattr(github, "exchange_code", lambda *args: "gh-token")
    monkeypatch.setattr(github, "fetch_user", lambda token: STRANGER)
    sent: list = []
    monkeypatch.setattr(notifier, "notify_access_request", lambda s, r: sent.append(r.login))
    return sent


def github_round_trip(client: TestClient, intent: str = "signin") -> str:
    """Run login + callback; return where the callback redirects."""
    start = client.get("/api/auth/github/login", params={"intent": intent}, follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
    response = client.get(
        "/api/auth/github/callback", params={"code": "c", "state": state}, follow_redirects=False
    )
    return response.headers["location"]


def test_config_reports_invite_only(anon_client: TestClient, invite_only: list):
    assert anon_client.get("/api/auth/config").json() == {"invite_only": True}


def test_request_approve_then_sign_in(
    anon_client: TestClient, login_as: Callable[[str], TestClient], invite_only: list
):
    # Not allowed yet: plain sign-in is refused.
    assert github_round_trip(anon_client) == "/login?error=not_allowed&login=stranger"

    # Requesting access records the request and notifies admins once.
    assert github_round_trip(anon_client, "request") == "/login?access=requested&login=stranger"
    assert github_round_trip(anon_client, "request") == "/login?access=requested&login=stranger"
    assert invite_only == ["stranger"]
    assert github_round_trip(anon_client) == "/login?access=pending&login=stranger"

    boss = login_as("boss")
    me = boss.get("/api/auth/me").json()
    assert me["is_admin"] is True and me["pending_access_requests"] == 1
    requests = boss.get("/api/admin/access-requests", params={"status": "pending"}).json()
    assert [r["login"] for r in requests] == ["stranger"]

    approved = boss.post(
        f"/api/admin/access-requests/{requests[0]['id']}", json={"status": "approved"}
    )
    assert approved.json()["status"] == "approved"
    assert approved.json()["decided_by"] == "boss"

    assert github_round_trip(anon_client) == "/"
    assert anon_client.get("/api/auth/me").json()["login"] == "stranger"


def test_revoke_signs_user_out(
    anon_client: TestClient, login_as: Callable[[str], TestClient], invite_only: list
):
    github_round_trip(anon_client, "request")
    boss = login_as("boss")
    request_id = boss.get("/api/admin/access-requests").json()[0]["id"]
    boss.post(f"/api/admin/access-requests/{request_id}", json={"status": "approved"})
    github_round_trip(anon_client)
    assert anon_client.get("/api/auth/me").status_code == 200

    boss.post(f"/api/admin/access-requests/{request_id}", json={"status": "revoked"})
    assert anon_client.get("/api/auth/me").status_code == 401
    assert github_round_trip(anon_client) == "/login?access=revoked&login=stranger"


def test_denied_user_can_request_again(
    anon_client: TestClient, login_as: Callable[[str], TestClient], invite_only: list
):
    github_round_trip(anon_client, "request")
    boss = login_as("boss")
    request_id = boss.get("/api/admin/access-requests").json()[0]["id"]
    boss.post(f"/api/admin/access-requests/{request_id}", json={"status": "denied"})
    assert github_round_trip(anon_client) == "/login?access=denied&login=stranger"

    assert github_round_trip(anon_client, "request") == "/login?access=requested&login=stranger"
    assert invite_only == ["stranger", "stranger"]


def test_admin_endpoints_are_admin_only(login_as: Callable[[str], TestClient], invite_only: list):
    alice = login_as("alice")
    assert alice.get("/api/auth/me").json()["is_admin"] is False
    assert alice.get("/api/admin/access-requests").status_code == 403
    assert (
        alice.post("/api/admin/access-requests/1", json={"status": "approved"}).status_code == 403
    )


@pytest.mark.parametrize("login", ["alice", "boss"])
@pytest.mark.parametrize("intent", ["signin", "request"])
def test_listed_users_sign_up_without_approval(
    anon_client: TestClient, invite_only: list, monkeypatch, login: str, intent: str
):
    """Allowed users and admins get an account on first sign-in, no request."""
    monkeypatch.setattr(github, "fetch_user", lambda token: GitHubUser(5, login, None, None))
    assert github_round_trip(anon_client, intent) == "/"
    assert anon_client.get("/api/auth/me").json()["login"] == login
    assert invite_only == []


def test_admin_list_alone_makes_app_invite_only(monkeypatch: pytest.MonkeyPatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "admin_github_users", "boss")
    assert settings.invite_only
    assert not settings.is_github_user_allowed("stranger")


def test_email_is_best_effort(monkeypatch: pytest.MonkeyPatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "smtp_host", "127.0.0.1")
    monkeypatch.setattr(settings, "smtp_port", 1)  # nothing listens here
    monkeypatch.setattr(settings, "notify_email", "me@example.com")
    assert notifier.send_email(settings, "Hello", "Body") is False


def test_email_content_and_starttls(monkeypatch: pytest.MonkeyPatch):
    """The notifier upgrades to TLS, logs in and sends a message with a review link."""
    settings = get_settings()
    for key, value in {
        "smtp_host": "smtp.example.com",
        "smtp_port": 587,
        "smtp_username": "apikey",
        "smtp_password": "secret",
        "smtp_from": "Ember <noreply@example.com>",
        "notify_email": "me@example.com",
        "public_url": "https://habits.example.com",
    }.items():
        monkeypatch.setattr(settings, key, value)

    calls: list = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            calls.append(("connect", host, port))

        def starttls(self, context):
            calls.append(("starttls",))

        def login(self, user, password):
            calls.append(("login", user, password))

        def send_message(self, message):
            calls.append(("send", message))

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    monkeypatch.setattr(notifier.smtplib, "SMTP", FakeSMTP)
    request = type("R", (), {"login": "stranger", "name": "A Stranger"})()

    assert notifier.notify_access_request(settings, request) is True
    assert calls[:3] == [
        ("connect", "smtp.example.com", 587),
        ("starttls",),
        ("login", "apikey", "secret"),
    ]
    message = calls[3][1]
    assert message["To"] == "me@example.com"
    assert message["From"] == "Ember <noreply@example.com>"
    assert message["Subject"] == "Access request from @stranger"
    assert "https://habits.example.com/admin/access" in message.get_content()
