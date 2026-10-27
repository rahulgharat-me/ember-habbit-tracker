"""Admin-only endpoints: reviewing access requests."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.models import AccessStatus, User
from app.services import access_service


def require_admin(user: CurrentUser) -> User:
    if not get_settings().is_admin(user.login):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can review access requests")
    return user


AdminUser = Annotated[User, Depends(require_admin)]

router = APIRouter(prefix="/admin", tags=["admin"])


class AccessRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    name: str | None
    avatar_url: str | None
    status: AccessStatus
    requested_at: datetime
    decided_at: datetime | None
    decided_by: str | None


class Decision(BaseModel):
    status: AccessStatus


@router.get("/access-requests", response_model=list[AccessRequestRead])
def list_access_requests(db: DbSession, _admin: AdminUser, status: AccessStatus | None = None):
    return access_service.list_requests(db, status)


@router.post("/access-requests/{request_id}", response_model=AccessRequestRead)
def decide_access_request(request_id: int, decision: Decision, db: DbSession, admin: AdminUser):
    """Approve, deny or revoke. Denying or revoking signs the user out everywhere."""
    if decision.status == AccessStatus.PENDING:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Choose approve, deny or revoke")
    return access_service.decide(db, request_id, decision.status, admin.login)
