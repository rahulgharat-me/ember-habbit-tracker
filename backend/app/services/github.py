"""Minimal GitHub OAuth client (authorization-code flow)."""

from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
TOKEN_URL = "https://github.com/login/oauth/access_token"
USER_URL = "https://api.github.com/user"
TIMEOUT_SECONDS = 10


class GitHubAuthError(Exception):
    pass


@dataclass(frozen=True)
class GitHubUser:
    id: int
    login: str
    name: str | None
    avatar_url: str | None


def authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
    # No scopes: we only read the public profile, never repositories or email.
    query = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "allow_signup": "true",
        }
    )
    return f"{AUTHORIZE_URL}?{query}"


def exchange_code(client_id: str, client_secret: str, code: str, redirect_uri: str) -> str:
    """Trade the callback ``code`` for an access token."""
    try:
        response = httpx.post(
            TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise GitHubAuthError("Could not reach GitHub") from exc

    token = response.json().get("access_token")
    if not token:
        raise GitHubAuthError(response.json().get("error_description", "GitHub refused the code"))
    return token


def fetch_user(access_token: str) -> GitHubUser:
    try:
        response = httpx.get(
            USER_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise GitHubAuthError("Could not load the GitHub profile") from exc

    data = response.json()
    return GitHubUser(
        id=data["id"],
        login=data["login"],
        name=data.get("name"),
        avatar_url=data.get("avatar_url"),
    )
