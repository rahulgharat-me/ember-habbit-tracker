"""Who may sign in to an invite-only instance, and the access-request workflow."""

from datetime import UTC, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import NotFoundError
from app.models import AccessRequest, AccessStatus, User, UserSession
from app.services.github import GitHubUser


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def get_request(db: Session, github_id: int) -> AccessRequest | None:
    return db.scalar(select(AccessRequest).where(AccessRequest.github_id == github_id))


def is_allowed(db: Session, settings: Settings, profile: GitHubUser) -> bool:
    if settings.is_github_user_allowed(profile.login):
        return True
    request = get_request(db, profile.id)
    return request is not None and request.status == AccessStatus.APPROVED


def submit_request(db: Session, profile: GitHubUser) -> tuple[AccessRequest, bool]:
    """Create or re-open a request. Returns ``(request, is_new_pending)``.

    ``is_new_pending`` is False when the request was already pending, so callers only notify
    admins once per request.
    """
    request = get_request(db, profile.id)
    if request is None:
        request = AccessRequest(github_id=profile.id)
        db.add(request)
    already_pending = request.status == AccessStatus.PENDING and request.id is not None
    request.login = profile.login
    request.name = profile.name
    request.avatar_url = profile.avatar_url
    if not already_pending:
        request.status = AccessStatus.PENDING
        request.requested_at = _now()
        request.decided_at = None
        request.decided_by = None
    db.commit()
    db.refresh(request)
    return request, not already_pending


def list_requests(db: Session, status: AccessStatus | None = None) -> list[AccessRequest]:
    stmt = select(AccessRequest).order_by(AccessRequest.requested_at.desc())
    if status is not None:
        stmt = stmt.where(AccessRequest.status == status)
    return list(db.scalars(stmt))


def pending_count(db: Session) -> int:
    return db.scalar(select(func.count()).where(AccessRequest.status == AccessStatus.PENDING)) or 0


def decide(db: Session, request_id: int, status: AccessStatus, admin_login: str) -> AccessRequest:
    """Approve, deny or revoke. Denying or revoking also signs that user out everywhere."""
    request = db.get(AccessRequest, request_id)
    if request is None:
        raise NotFoundError(f"Access request {request_id} not found")
    request.status = status
    request.decided_at = _now()
    request.decided_by = admin_login
    if status in (AccessStatus.DENIED, AccessStatus.REVOKED):
        user_id = db.scalar(select(User.id).where(User.github_id == request.github_id))
        if user_id is not None:
            db.execute(delete(UserSession).where(UserSession.user_id == user_id))
    db.commit()
    db.refresh(request)
    return request
