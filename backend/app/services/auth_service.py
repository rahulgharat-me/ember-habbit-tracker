"""Users and browser sessions."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models import Habit, User, UserSession
from app.services.github import GitHubUser


def _now() -> datetime:
    # Naive UTC, matching how SQLite stores DateTime columns.
    return datetime.now(UTC).replace(tzinfo=None)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def upsert_github_user(db: Session, profile: GitHubUser) -> User:
    user = db.scalar(select(User).where(User.github_id == profile.id))
    if user is None:
        user = User(github_id=profile.id)
        db.add(user)
    user.login = profile.login
    user.name = profile.name
    user.avatar_url = profile.avatar_url
    user.last_login_at = _now()
    db.flush()
    return user


def claim_unowned_habits(db: Session, user: User) -> int:
    """Give habits created before sign-in existed to ``user``. Returns how many were claimed."""
    result = db.execute(update(Habit).where(Habit.user_id.is_(None)).values(user_id=user.id))
    return result.rowcount


def create_session(db: Session, user: User, days: int) -> str:
    """Create a session and return the raw token for the cookie (only its hash is stored)."""
    db.execute(delete(UserSession).where(UserSession.expires_at < _now()))
    token = secrets.token_urlsafe(32)
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=_hash_token(token),
            expires_at=_now() + timedelta(days=days),
        )
    )
    db.commit()
    return token


def get_user_for_token(db: Session, token: str) -> User | None:
    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == _hash_token(token), UserSession.expires_at > _now()
        )
    )
    return session.user if session else None


def delete_session(db: Session, token: str) -> None:
    db.execute(delete(UserSession).where(UserSession.token_hash == _hash_token(token)))
    db.commit()
