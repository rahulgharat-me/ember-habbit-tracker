"""Loads habit history from the database and feeds it to the pure streak calculations."""

from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidOperationError
from app.models import Habit, HabitLog
from app.schemas.stats import (
    CalendarDay,
    HabitStats,
    Insights,
    Summary,
    WeekdayStat,
    WeekStat,
)
from app.services import streaks
from app.services.streaks import HabitHistory

MAX_CALENDAR_DAYS = 400
RATE_WINDOW_DAYS = 30


def load_histories(db: Session, user_id: int, *, habit_id: int | None = None) -> list[HabitHistory]:
    habit_stmt = select(Habit).where(Habit.user_id == user_id).order_by(Habit.id)
    log_stmt = select(HabitLog).join(Habit).where(Habit.user_id == user_id)
    if habit_id is not None:
        habit_stmt = habit_stmt.where(Habit.id == habit_id)
        log_stmt = log_stmt.where(HabitLog.habit_id == habit_id)

    completed: dict[int, set[date]] = defaultdict(set)
    missed: dict[int, set[date]] = defaultdict(set)
    for log in db.scalars(log_stmt):
        (completed if log.completed else missed)[log.habit_id].add(log.date)

    histories = []
    for habit in db.scalars(habit_stmt):
        # Logs on days the habit is not scheduled (outside its range, or a day off added after
        # the fact) are ignored rather than deleted, so removing the exception restores them.
        histories.append(
            HabitHistory(
                habit_id=habit.id,
                start_date=habit.start_date,
                end_date=habit.archived_on,
                completed_days=frozenset(
                    d for d in completed[habit.id] if habit.is_scheduled_on(d)
                ),
                missed_days=frozenset(d for d in missed[habit.id] if habit.is_scheduled_on(d)),
                skip_weekdays=frozenset(habit.skip_weekdays),
                skip_dates=frozenset(habit.skip_dates),
            )
        )
    return histories


def get_summary(db: Session, user_id: int, today: date) -> Summary:
    histories = load_histories(db, user_id)
    total, done, _ = streaks.day_counts(histories, today)
    rate_start = today - timedelta(days=RATE_WINDOW_DAYS - 1)
    return Summary(
        today=today,
        current_streak=streaks.overall_current_streak(histories, today),
        longest_streak=streaks.overall_longest_streak(histories, today),
        perfect_days=streaks.perfect_day_count(histories, today),
        today_total=total,
        today_completed=done,
        habits=[
            HabitStats(
                habit_id=h.habit_id,
                current_streak=streaks.habit_current_streak(h, today),
                longest_streak=streaks.habit_longest_streak(h, today),
                total_completions=len(h.completed_days),
                completion_rate_30d=streaks.habit_tally(h, rate_start, today).rate,
            )
            for h in histories
        ],
    )


def get_calendar(
    db: Session, user_id: int, start: date, end: date, today: date, *, habit_id: int | None = None
) -> list[CalendarDay]:
    if start > end:
        raise InvalidOperationError("start must be on or before end")
    if (end - start).days >= MAX_CALENDAR_DAYS:
        raise InvalidOperationError(f"Range may not exceed {MAX_CALENDAR_DAYS} days")

    histories = load_histories(db, user_id, habit_id=habit_id)
    days = []
    for day in streaks.date_range(start, end):
        total, done, missed = streaks.day_counts(histories, day)
        days.append(
            CalendarDay(
                date=day,
                total=total,
                completed=done,
                missed=missed,
                status=streaks.day_status(
                    total, done, day, today, rest=streaks.is_rest_day(histories, day)
                ),
            )
        )
    return days


def get_insights(db: Session, user_id: int, today: date, *, days: int, weeks: int) -> Insights:
    histories = load_histories(db, user_id)
    start = today - timedelta(days=days - 1)
    weekday_tallies = streaks.weekday_tallies(histories, start, today)
    return Insights(
        weekdays=[
            WeekdayStat(weekday=i, possible=t.possible, completed=t.completed, rate=t.rate)
            for i, t in enumerate(weekday_tallies)
        ],
        weeks=[
            WeekStat(week_start=ws, possible=t.possible, completed=t.completed, rate=t.rate)
            for ws, t in streaks.weekly_tallies(histories, weeks, today)
        ],
    )
