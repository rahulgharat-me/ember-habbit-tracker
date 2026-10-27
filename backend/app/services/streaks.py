"""Pure streak and statistics calculations.

Rules:
- A habit is *tracked* from ``start_date`` until ``end_date`` (the archive date, exclusive).
- A tracked habit is *scheduled* on a day unless that weekday is in ``skip_weekdays``
  (e.g. "not on Sundays") or the day is in ``skip_dates`` (one-off exceptions).
- A day is *perfect* when at least one habit is scheduled and every scheduled habit is
  completed. A day with nothing scheduled is a *rest day*: it neither breaks nor extends a streak.
- The overall streak is the number of consecutive perfect days ending today. Today is still
  "in progress", so if today is not yet perfect the streak is counted up to yesterday instead
  of being broken. Any past scheduled day that is not perfect (missed or simply not marked)
  breaks it.
- Per-habit streaks follow the same rules, looking only at that habit's scheduled days.
- Rates only count scheduled days that are over, plus today when the habit is already
  completed, so an unfinished today never drags the numbers down.
"""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date, timedelta

ONE_DAY = timedelta(days=1)


@dataclass(frozen=True)
class HabitHistory:
    habit_id: int
    start_date: date
    end_date: date | None
    completed_days: frozenset[date]
    missed_days: frozenset[date] = frozenset()
    skip_weekdays: frozenset[int] = frozenset()
    skip_dates: frozenset[date] = frozenset()

    def is_tracked(self, day: date) -> bool:
        return self.start_date <= day and (self.end_date is None or day < self.end_date)

    def is_active(self, day: date) -> bool:
        """Whether the habit is scheduled (required) on ``day``."""
        return (
            self.is_tracked(day)
            and day.weekday() not in self.skip_weekdays
            and day not in self.skip_dates
        )

    def is_completed(self, day: date) -> bool:
        return day in self.completed_days

    def counts_towards_rate(self, day: date, today: date) -> bool:
        return self.is_active(day) and (day < today or self.is_completed(day))

    @property
    def last_day(self) -> date | None:
        return None if self.end_date is None else self.end_date - ONE_DAY


@dataclass(frozen=True)
class Tally:
    possible: int = 0
    completed: int = 0

    @property
    def rate(self) -> float:
        return round(self.completed / self.possible, 4) if self.possible else 0.0


def date_range(start: date, end: date) -> Iterable[date]:
    """Yield every day from ``start`` to ``end`` inclusive."""
    day = start
    while day <= end:
        yield day
        day += ONE_DAY


def habit_current_streak(history: HabitHistory, today: date) -> int:
    day = today if history.last_day is None else min(today, history.last_day)
    if history.is_active(day) and not history.is_completed(day):
        day -= ONE_DAY  # an unfinished today is still in progress
    streak = 0
    while day >= history.start_date:
        if history.is_active(day):
            if not history.is_completed(day):
                break
            streak += 1
        day -= ONE_DAY
    return streak


def habit_longest_streak(history: HabitHistory, today: date) -> int:
    end = today if history.last_day is None else min(today, history.last_day)
    longest = current = 0
    for day in date_range(history.start_date, end):
        if not history.is_active(day):
            continue
        if history.is_completed(day):
            current += 1
            longest = max(longest, current)
        elif day < today:
            current = 0
    return longest


def habit_tally(history: HabitHistory, start: date, today: date) -> Tally:
    possible = completed = 0
    for day in date_range(start, today):
        if history.counts_towards_rate(day, today):
            possible += 1
            completed += history.is_completed(day)
    return Tally(possible, completed)


def day_counts(histories: Sequence[HabitHistory], day: date) -> tuple[int, int, int]:
    """Return ``(scheduled, completed, explicitly_missed)`` habit counts for a day."""
    active = [h for h in histories if h.is_active(day)]
    completed = sum(h.is_completed(day) for h in active)
    missed = sum(day in h.missed_days for h in active)
    return len(active), completed, missed


def is_perfect_day(histories: Sequence[HabitHistory], day: date) -> bool:
    total, completed, _ = day_counts(histories, day)
    return total > 0 and completed == total


def is_rest_day(histories: Sequence[HabitHistory], day: date) -> bool:
    """Some habit is tracked on ``day`` but none is scheduled."""
    return any(h.is_tracked(day) for h in histories) and not any(
        h.is_active(day) for h in histories
    )


def overall_current_streak(histories: Sequence[HabitHistory], today: date) -> int:
    if not histories:
        return 0
    first_day = min(h.start_date for h in histories)
    day = today
    total, completed, _ = day_counts(histories, day)
    if total and completed < total:
        day -= ONE_DAY  # an unfinished today is still in progress
    streak = 0
    while day >= first_day:
        total, completed, _ = day_counts(histories, day)
        if total:
            if completed < total:
                break
            streak += 1
        day -= ONE_DAY
    return streak


def overall_longest_streak(histories: Sequence[HabitHistory], today: date) -> int:
    longest = current = 0
    for day in _tracked_days(histories, today):
        total, completed, _ = day_counts(histories, day)
        if not total:
            continue
        if completed == total:
            current += 1
            longest = max(longest, current)
        elif day < today:
            current = 0
    return longest


def perfect_day_count(histories: Sequence[HabitHistory], today: date) -> int:
    return sum(is_perfect_day(histories, day) for day in _tracked_days(histories, today))


def day_status(total: int, completed: int, day: date, today: date, *, rest: bool = False) -> str:
    if day > today:
        return "rest" if rest else "future"
    if total == 0:
        return "rest" if rest else "empty"
    if completed == total:
        return "complete"
    if day == today:
        return "pending"
    return "partial" if completed else "missed"


def weekday_tallies(histories: Sequence[HabitHistory], start: date, today: date) -> list[Tally]:
    possible = [0] * 7
    completed = [0] * 7
    for day in date_range(start, today):
        for history in histories:
            if history.counts_towards_rate(day, today):
                possible[day.weekday()] += 1
                completed[day.weekday()] += history.is_completed(day)
    return [Tally(p, c) for p, c in zip(possible, completed, strict=True)]


def weekly_tallies(
    histories: Sequence[HabitHistory], weeks: int, today: date
) -> list[tuple[date, Tally]]:
    current_week_start = today - timedelta(days=today.weekday())
    result = []
    for offset in range(weeks - 1, -1, -1):
        week_start = current_week_start - timedelta(weeks=offset)
        week_end = min(week_start + timedelta(days=6), today)
        possible = completed = 0
        for day in date_range(week_start, week_end):
            for history in histories:
                if history.counts_towards_rate(day, today):
                    possible += 1
                    completed += history.is_completed(day)
        result.append((week_start, Tally(possible, completed)))
    return result


def _tracked_days(histories: Sequence[HabitHistory], today: date) -> Iterable[date]:
    if not histories:
        return ()
    return date_range(min(h.start_date for h in histories), today)
