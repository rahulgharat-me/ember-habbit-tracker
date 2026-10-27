"""Sign in with GitHub (the only sign-in method), access requests and session management."""

import logging
import secrets
from typing import Annotated, Literal
from urllib.parse import urlencode

from fastapi import APIRouter, BackgroundTasks, Cookie, Response, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.api.deps import SESSION_COOKIE, CurrentUser, DbSession
from app.core.config import get_settings
from app.models import AccessStatus
from app.services import access_service, auth_service, github, notifier

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

STATE_COOKIE = "habit_oauth_state"
INTENT_COOKIE = "habit_oauth_intent"
OAUTH_COOKIE_PATH = "/api/auth"
STATE_MAX_AGE_SECONDS = 600
LOGIN_PAGE = "/login"

Intent = Literal["signin", "request"]


class AuthConfig(BaseModel):
    invite_only: bool


class UserRead(BaseModel):
    login: str
    name: str | None
    avatar_url: str | None
    is_admin: bool
    pending_access_requests: int


def _to_login_page(**params: str) -> RedirectResponse:
    response = RedirectResponse(f"{LOGIN_PAGE}?{urlencode(params)}", status.HTTP_302_FOUND)
    for cookie in (STATE_COOKIE, INTENT_COOKIE):
        response.delete_cookie(cookie, path=OAUTH_COOKIE_PATH)
    return response


def _login_error(code: str) -> RedirectResponse:
    return _to_login_page(error=code)


@router.get("/config", response_model=AuthConfig)
def auth_config():
    """Public: lets the login page know whether to offer "Request access"."""
    return AuthConfig(invite_only=get_settings().invite_only)


@router.get("/github/login")
def github_login(intent: Intent = "signin") -> RedirectResponse:
    settings = get_settings()
    if not settings.github_configured:
        return _login_error("not_configured")

    # `state` ties the callback to this browser and blocks login CSRF.
    state = secrets.token_urlsafe(24)
    response = RedirectResponse(
        github.authorize_url(settings.github_client_id, settings.github_callback_url, state),
        status.HTTP_302_FOUND,
    )
    for name, value in ((STATE_COOKIE, state), (INTENT_COOKIE, intent)):
        response.set_cookie(
            name,
            value,
            max_age=STATE_MAX_AGE_SECONDS,
            path=OAUTH_COOKIE_PATH,
            httponly=True,
            samesite="lax",
            secure=settings.secure_cookies,
        )
    return response


@router.get("/github/callback")
def github_callback(
    db: DbSession,
    background: BackgroundTasks,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    expected_state: Annotated[str | None, Cookie(alias=STATE_COOKIE)] = None,
    intent: Annotated[str | None, Cookie(alias=INTENT_COOKIE)] = None,
) -> RedirectResponse:
    settings = get_settings()
    if error:
        return _login_error("denied")
    if (
        not code
        or not state
        or not expected_state
        or not secrets.compare_digest(state, expected_state)
    ):
        return _login_error("invalid_state")

    try:
        token = github.exchange_code(
            settings.github_client_id,
            settings.github_client_secret,
            code,
            settings.github_callback_url,
        )
        profile = github.fetch_user(token)
    except github.GitHubAuthError:
        logger.exception("GitHub sign-in failed")
        return _login_error("github")

    if not access_service.is_allowed(db, settings, profile):
        return _handle_not_allowed(db, background, profile, wants_access=intent == "request")

    user = auth_service.upsert_github_user(db, profile)
    claimed = auth_service.claim_unowned_habits(db, user)
    if claimed:
        logger.info("Assigned %d existing habit(s) to %s", claimed, user.login)
    session_token = auth_service.create_session(db, user, settings.session_days)

    response = RedirectResponse("/", status.HTTP_302_FOUND)
    for cookie in (STATE_COOKIE, INTENT_COOKIE):
        response.delete_cookie(cookie, path=OAUTH_COOKIE_PATH)
    response.set_cookie(
        SESSION_COOKIE,
        session_token,
        max_age=settings.session_days * 24 * 60 * 60,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
    )
    return response


def _handle_not_allowed(
    db: DbSession, background: BackgroundTasks, profile: github.GitHubUser, *, wants_access: bool
) -> RedirectResponse:
    """Record an access request (if asked for) and tell the login page the request status."""
    if wants_access:
        request, is_new = access_service.submit_request(db, profile)
        if is_new:
            logger.info("Access requested by %s", profile.login)
            background.add_task(notifier.notify_access_request, get_settings(), request)
        return _to_login_page(access="requested", login=profile.login)

    existing = access_service.get_request(db, profile.id)
    if existing is not None and existing.status != AccessStatus.APPROVED:
        return _to_login_page(access=existing.status, login=profile.login)
    logger.warning("GitHub user %s is not allowed to sign in", profile.login)
    return _to_login_page(error="not_allowed", login=profile.login)


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser, db: DbSession):
    is_admin = get_settings().is_admin(user.login)
    return UserRead(
        login=user.login,
        name=user.name,
        avatar_url=user.avatar_url,
        is_admin=is_admin,
        pending_access_requests=access_service.pending_count(db) if is_admin else 0,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    db: DbSession, session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None
) -> Response:
    if session_token:
        auth_service.delete_session(db, session_token)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return response
