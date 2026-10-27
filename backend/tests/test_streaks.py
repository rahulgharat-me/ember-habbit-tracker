from datetime import date, timedelta

from app.services import streaks
from app.services.streaks import HabitHistory

TODAY = date(2026, 10, 26)


def days_ago(*offsets: int) -> frozenset[date]:
    return frozenset(TODAY - timedelta(days=n) for n in offsets)


def habit(habit_id: int, completed: frozenset[date], start_offset: int = 30, **kwargs):
    return HabitHistory(
        habit_id=habit_id,
        start_date=TODAY - timedelta(days=start_offset),
        end_date=kwargs.get("end_date"),
        completed_days=completed,
        skip_weekdays=frozenset(kwargs.get("skip_weekdays", ())),
        skip_dates=frozenset(kwargs.get("skip_dates", ())),
    )


# TODAY (2026-10-26) is a Monday, so 1 day ago is Sunday and 2 days ago is Saturday.
SUNDAY = 6


class TestHabitStreaks:
    def test_counts_through_today_when_done(self):
        h = habit(1, days_ago(0, 1, 2))
        assert streaks.habit_current_streak(h, TODAY) == 3

    def test_unfinished_today_does_not_break_streak(self):
        h = habit(1, days_ago(1, 2))
        assert streaks.habit_current_streak(h, TODAY) == 2

    def test_missed_yesterday_breaks_streak(self):
        h = habit(1, days_ago(2, 3, 4))
        assert streaks.habit_current_streak(h, TODAY) == 0

    def test_longest_streak(self):
        h = habit(1, days_ago(0, 1, 5, 6, 7, 8, 10))
        assert streaks.habit_longest_streak(h, TODAY) == 4

    def test_rate_ignores_unfinished_today(self):
        h = habit(1, days_ago(1, 2), start_offset=3)
        tally = streaks.habit_tally(h, TODAY - timedelta(days=29), TODAY)
        assert (tally.possible, tally.completed) == (3, 2)


class TestOverallStreak:
    def test_requires_every_habit(self):
        histories = [habit(1, days_ago(0, 1, 2, 3)), habit(2, days_ago(0, 1, 3))]
        assert streaks.overall_current_streak(histories, TODAY) == 2
        assert streaks.overall_longest_streak(histories, TODAY) == 2

    def test_new_habit_does_not_affect_earlier_days(self):
        histories = [habit(1, days_ago(0, 1, 2, 3)), habit(2, days_ago(0), start_offset=0)]
        assert streaks.overall_current_streak(histories, TODAY) == 4

    def test_archived_habit_stops_counting(self):
        archived = HabitHistory(
            2, TODAY - timedelta(days=30), TODAY - timedelta(days=1), days_ago()
        )
        histories = [habit(1, days_ago(0, 1, 2)), archived]
        # Only yesterday and today are free of the (never completed) archived habit.
        assert streaks.overall_current_streak(histories, TODAY) == 2

    def test_no_habits(self):
        assert streaks.overall_current_streak([], TODAY) == 0
        assert streaks.overall_longest_streak([], TODAY) == 0


class TestExceptions:
    def test_weekly_day_off_does_not_break_habit_streak(self):
        h = habit(1, days_ago(0, 2, 3), skip_weekdays={SUNDAY})
        assert streaks.habit_current_streak(h, TODAY) == 3
        assert streaks.habit_longest_streak(h, TODAY) == 3

    def test_specific_skip_date_does_not_break_habit_streak(self):
        h = habit(1, days_ago(1, 3), skip_dates=days_ago(2))
        assert streaks.habit_current_streak(h, TODAY) == 2

    def test_rest_day_bridges_overall_streak(self):
        histories = [
            habit(1, days_ago(0, 2, 3), skip_weekdays={SUNDAY}),
            habit(2, days_ago(0, 2, 3), skip_weekdays={SUNDAY}),
        ]
        assert streaks.is_rest_day(histories, TODAY - timedelta(days=1))
        assert streaks.overall_current_streak(histories, TODAY) == 3
        assert streaks.overall_longest_streak(histories, TODAY) == 3

    def test_one_habit_off_others_still_required(self):
        histories = [
            habit(1, days_ago(0, 2), skip_weekdays={SUNDAY}),
            habit(2, days_ago(0, 2)),  # not done on Sunday -> breaks
        ]
        assert streaks.overall_current_streak(histories, TODAY) == 1

    def test_skipped_days_do_not_count_towards_rate(self):
        h = habit(1, days_ago(2, 3), start_offset=3, skip_dates=days_ago(1))
        tally = streaks.habit_tally(h, TODAY - timedelta(days=29), TODAY)
        assert (tally.possible, tally.completed) == (2, 2)


def test_day_status():
    yesterday = TODAY - timedelta(days=1)
    assert streaks.day_status(2, 2, yesterday, TODAY) == "complete"
    assert streaks.day_status(2, 1, yesterday, TODAY) == "partial"
    assert streaks.day_status(2, 0, yesterday, TODAY) == "missed"
    assert streaks.day_status(2, 1, TODAY, TODAY) == "pending"
    assert streaks.day_status(0, 0, yesterday, TODAY) == "empty"
    assert streaks.day_status(0, 0, yesterday, TODAY, rest=True) == "rest"
    assert streaks.day_status(2, 0, TODAY + timedelta(days=1), TODAY) == "future"
