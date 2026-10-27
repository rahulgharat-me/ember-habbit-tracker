"""CRUD operations for habits and their daily logs, always scoped to one user."""

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidOperationError, NotFoundError
from app.models import Habit, HabitLog, HabitSkipDate
from app.schemas.habit import HabitCreate, HabitUpdate

# Allow one day of slack so clients in timezones ahead of the server can log "today".
MAX_FUTURE_DAYS = 1


def list_habits(db: Session, user_id: int, *, include_archived: bool = False) -> list[Habit]:
    stmt = select(Habit).where(Habit.user_id == user_id).order_by(Habit.id)
    if not include_archived:
        stmt = stmt.where(Habit.archived_on.is_(None))
    return list(db.scalars(stmt))


def get_habit(db: Session, user_id: int, habit_id: int) -> Habit:
    habit = db.get(Habit, habit_id)
    # Another user's habit is reported as missing rather than forbidden, to not leak its existence.
    if habit is None or habit.user_id != user_id:
        raise NotFoundError(f"Habit {habit_id} not found")
    return habit


def create_habit(db: Session, user_id: int, data: HabitCreate) -> Habit:
    habit = Habit(
        user_id=user_id,
        name=data.name,
        description=data.description or None,
        color=data.color,
        icon=data.icon,
        start_date=data.start_date or date.today(),
        skip_weekdays=data.skip_weekdays,
        skip_date_entries=[HabitSkipDate(date=d) for d in data.skip_dates],
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


def update_habit(db: Session, user_id: int, habit_id: int, data: HabitUpdate) -> Habit:
    habit = get_habit(db, user_id, habit_id)
    changes = data.model_dump(exclude_unset=True)

    archived = changes.pop("archived", None)
    if archived is True and habit.archived_on is None:
        habit.archived_on = date.today()
    elif archived is False:
        habit.archived_on = None

    skip_dates = changes.pop("skip_dates", None)
    if skip_dates is not None:
        _replace_skip_dates(db, habit, skip_dates)

    if "description" in changes:
        changes["description"] = changes["description"] or None
    for field, value in changes.items():
        if value is not None or field == "description":
            setattr(habit, field, value)

    db.commit()
    db.refresh(habit)
    return habit


def delete_habit(db: Session, user_id: int, habit_id: int) -> None:
    db.delete(get_habit(db, user_id, habit_id))
    db.commit()


def list_logs(
    db: Session, user_id: int, *, start: date, end: date, habit_id: int | None = None
) -> list[HabitLog]:
    if start > end:
        raise InvalidOperationError("start must be on or before end")
    stmt = (
        select(HabitLog)
        .join(Habit)
        .where(Habit.user_id == user_id, HabitLog.date >= start, HabitLog.date <= end)
        .order_by(HabitLog.date, HabitLog.habit_id)
    )
    if habit_id is not None:
        stmt = stmt.where(HabitLog.habit_id == habit_id)
    return list(db.scalars(stmt))


def set_log(db: Session, user_id: int, habit_id: int, day: date, *, completed: bool) -> HabitLog:
    habit = get_habit(db, user_id, habit_id)
    _validate_log_day(habit, day)

    log = db.scalar(select(HabitLog).where(HabitLog.habit_id == habit_id, HabitLog.date == day))
    if log is None:
        log = HabitLog(habit_id=habit_id, date=day, completed=completed)
        db.add(log)
    else:
        log.completed = completed
    db.commit()
    db.refresh(log)
    return log


def clear_log(db: Session, user_id: int, habit_id: int, day: date) -> None:
    get_habit(db, user_id, habit_id)
    log = db.scalar(select(HabitLog).where(HabitLog.habit_id == habit_id, HabitLog.date == day))
    if log is not None:
        db.delete(log)
        db.commit()


def add_skip_date(db: Session, user_id: int, habit_id: int, day: date) -> Habit:
    habit = get_habit(db, user_id, habit_id)
    if day < habit.start_date:
        raise InvalidOperationError(f"'{habit.name}' has not started on {day.isoformat()}")
    if day not in habit.skip_dates:
        habit.skip_date_entries.append(HabitSkipDate(date=day))
        db.commit()
        db.refresh(habit)
    return habit


def remove_skip_date(db: Session, user_id: int, habit_id: int, day: date) -> Habit:
    habit = get_habit(db, user_id, habit_id)
    habit.skip_date_entries = [e for e in habit.skip_date_entries if e.date != day]
    db.commit()
    db.refresh(habit)
    return habit


def _replace_skip_dates(db: Session, habit: Habit, days: list[date]) -> None:
    wanted = set(days)
    existing = {entry.date for entry in habit.skip_date_entries}
    habit.skip_date_entries = [e for e in habit.skip_date_entries if e.date in wanted] + [
        HabitSkipDate(date=d) for d in sorted(wanted - existing)
    ]
    db.flush()


def _validate_log_day(habit: Habit, day: date) -> None:
    if day > date.today() + timedelta(days=MAX_FUTURE_DAYS):
        raise InvalidOperationError("Cannot log a habit for a future date")
    if day < habit.start_date:
        raise InvalidOperationError(
            f"'{habit.name}' starts on {habit.start_date.isoformat()}; "
            "change its start date to log earlier days"
        )
    if habit.archived_on is not None and day >= habit.archived_on:
        raise InvalidOperationError(f"'{habit.name}' is archived")
    if not habit.is_scheduled_on(day):
        raise InvalidOperationError(
            f"'{habit.name}' is not scheduled on {day.isoformat()} (it is a day off for it)"
        )
