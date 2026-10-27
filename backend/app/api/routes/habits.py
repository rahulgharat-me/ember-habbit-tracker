from datetime import date

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.habit import HabitCreate, HabitRead, HabitUpdate, LogRead, LogUpsert
from app.services import habit_service

router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("", response_model=list[HabitRead])
def list_habits(db: DbSession, user: CurrentUser, include_archived: bool = False):
    return habit_service.list_habits(db, user.id, include_archived=include_archived)


@router.post("", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
def create_habit(data: HabitCreate, db: DbSession, user: CurrentUser):
    return habit_service.create_habit(db, user.id, data)


@router.get("/{habit_id}", response_model=HabitRead)
def get_habit(habit_id: int, db: DbSession, user: CurrentUser):
    return habit_service.get_habit(db, user.id, habit_id)


@router.patch("/{habit_id}", response_model=HabitRead)
def update_habit(habit_id: int, data: HabitUpdate, db: DbSession, user: CurrentUser):
    return habit_service.update_habit(db, user.id, habit_id, data)


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(habit_id: int, db: DbSession, user: CurrentUser) -> Response:
    habit_service.delete_habit(db, user.id, habit_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{habit_id}/logs/{log_date}", response_model=LogRead)
def set_log(habit_id: int, log_date: date, data: LogUpsert, db: DbSession, user: CurrentUser):
    return habit_service.set_log(db, user.id, habit_id, log_date, completed=data.completed)


@router.delete("/{habit_id}/logs/{log_date}", status_code=status.HTTP_204_NO_CONTENT)
def clear_log(habit_id: int, log_date: date, db: DbSession, user: CurrentUser) -> Response:
    habit_service.clear_log(db, user.id, habit_id, log_date)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{habit_id}/skips/{skip_date}", response_model=HabitRead)
def add_skip_date(habit_id: int, skip_date: date, db: DbSession, user: CurrentUser):
    """Mark ``skip_date`` as a day off for this habit: it will not be required that day."""
    return habit_service.add_skip_date(db, user.id, habit_id, skip_date)


@router.delete("/{habit_id}/skips/{skip_date}", response_model=HabitRead)
def remove_skip_date(habit_id: int, skip_date: date, db: DbSession, user: CurrentUser):
    return habit_service.remove_skip_date(db, user.id, habit_id, skip_date)
