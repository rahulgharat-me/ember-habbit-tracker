from datetime import date

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.habit import LogRead
from app.services import habit_service

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=list[LogRead])
def list_logs(
    start: date, end: date, db: DbSession, user: CurrentUser, habit_id: int | None = None
):
    return habit_service.list_logs(db, user.id, start=start, end=end, habit_id=habit_id)
