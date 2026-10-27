from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, Today
from app.schemas.stats import CalendarDay, Insights, Summary
from app.services import stats_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=Summary)
def get_summary(db: DbSession, user: CurrentUser, today: Today):
    return stats_service.get_summary(db, user.id, today)


@router.get("/calendar", response_model=list[CalendarDay])
def get_calendar(
    start: date,
    end: date,
    db: DbSession,
    user: CurrentUser,
    today: Today,
    habit_id: int | None = None,
):
    return stats_service.get_calendar(db, user.id, start, end, today, habit_id=habit_id)


@router.get("/insights", response_model=Insights)
def get_insights(
    db: DbSession,
    user: CurrentUser,
    today: Today,
    days: Annotated[int, Query(ge=7, le=366)] = 90,
    weeks: Annotated[int, Query(ge=1, le=52)] = 12,
):
    return stats_service.get_insights(db, user.id, today, days=days, weeks=weeks)
