from collections.abc import Callable
from datetime import date
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Habit
from app.services import github
from app.services.github import GitHubUser

PROFILE = GitHubUser(id=42, login="octocat", name="The Octocat", avatar_url="https://a/1.png")


@pytest.fixture
def fake_github(monkeypatch: pytest.MonkeyPatch) -> dict:
    calls: dict = {}

    def exchange_code(client_id, client_secret, code, redirect_uri):
        calls["exchange"] = (client_id, code, redirect_uri)
        if code == "bad":
            raise github.GitHubAuthError("bad code")
        return "gh-token"

    monkeypatch.setattr(github, "exchange_code", exchange_code)
    monkeypatch.setattr(github, "fetch_user", lambda token: PROFILE)
    return calls


def start_login(client: TestClient) -> str:
    response = client.get("/api/auth/github/login", follow_redirects=False)
    assert response.status_code == 302
    location = urlparse(response.headers["location"])
    assert location.netloc == "github.com"
    query = parse_qs(location.query)
    assert query["client_id"] == ["test-client-id"]
    assert query["redirect_uri"] == ["http://localhost:3000/api/auth/github/callback"]
    return query["state"][0]


def finish_login(client: TestClient, state: str, code: str = "good"):
    return client.get(
        "/api/auth/github/callback", params={"code": code, "state": state}, follow_redirects=False
    )


def test_data_endpoints_require_sign_in(anon_client: TestClient):
    for path in ("/api/habits", "/api/stats/summary", "/api/auth/me"):
        assert anon_client.get(path).status_code == 401
    assert anon_client.get("/api/health").status_code == 200


def test_full_github_sign_in(anon_client: TestClient, fake_github: dict):
    state = start_login(anon_client)
    response = finish_login(anon_client, state)

    assert response.status_code == 302
    assert response.headers["location"] == "/"
    assert fake_github["exchange"] == (
        "test-client-id",
        "good",
        "http://localhost:3000/api/auth/github/callback",
    )
    me = anon_client.get("/api/auth/me").json()
    assert me == {
        "login": "octocat",
        "name": "The Octocat",
        "avatar_url": "https://a/1.png",
        "is_admin": False,
        "pending_access_requests": 0,
    }

    assert anon_client.post("/api/auth/logout").status_code == 204
    assert anon_client.get("/api/auth/me").status_code == 401


def test_state_mismatch_is_rejected(anon_client: TestClient, fake_github: dict):
    start_login(anon_client)
    response = finish_login(anon_client, "forged-state")
    assert response.headers["location"] == "/login?error=invalid_state"
    assert "exchange" not in fake_github


def test_github_errors_and_denial(anon_client: TestClient, fake_github: dict):
    state = start_login(anon_client)
    assert finish_login(anon_client, state, code="bad").headers["location"] == "/login?error=github"

    response = anon_client.get(
        "/api/auth/github/callback", params={"error": "access_denied"}, follow_redirects=False
    )
    assert response.headers["location"] == "/login?error=denied"


def test_allowlist(anon_client: TestClient, fake_github: dict, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(get_settings(), "allowed_github_users", "someone-else, another")
    state = start_login(anon_client)
    location = finish_login(anon_client, state).headers["location"]
    assert location == "/login?error=not_allowed&login=octocat"
    assert anon_client.get("/api/auth/me").status_code == 401

    monkeypatch.setattr(get_settings(), "allowed_github_users", "OctoCat")  # case-insensitive
    state = start_login(anon_client)
    assert finish_login(anon_client, state).headers["location"] == "/"


def test_not_configured(anon_client: TestClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(get_settings(), "github_client_id", "")
    response = anon_client.get("/api/auth/github/login", follow_redirects=False)
    assert response.headers["location"] == "/login?error=not_configured"


def test_first_sign_in_claims_existing_habits(
    anon_client: TestClient, db_session: Session, fake_github: dict
):
    db_session.add(Habit(name="From before login", start_date=date.today()))
    db_session.commit()

    finish_login(anon_client, start_login(anon_client))
    habits = anon_client.get("/api/habits").json()
    assert [h["name"] for h in habits] == ["From before login"]


def test_users_cannot_see_each_other(login_as: Callable[[str], TestClient]):
    alice, bob = login_as("alice"), login_as("bob")
    habit = alice.post("/api/habits", json={"name": "Alice only"}).json()

    assert bob.get("/api/habits").json() == []
    assert bob.get(f"/api/habits/{habit['id']}").status_code == 404
    assert bob.delete(f"/api/habits/{habit['id']}").status_code == 404
    response = bob.put(f"/api/habits/{habit['id']}/logs/{date.today()}", json={"completed": True})
    assert response.status_code == 404
    assert bob.get("/api/stats/summary").json()["habits"] == []
    assert len(alice.get("/api/habits").json()) == 1
