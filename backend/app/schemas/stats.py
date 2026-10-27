from datetime import date
from typing import Literal

from pydantic import BaseModel

DayStatus = Literal["complete", "partial", "missed", "pending", "future", "empty", "rest"]


class HabitStats(BaseModel):
    habit_id: int
    current_streak: int
    longest_streak: int
    total_completions: int
    completion_rate_30d: float


class Summary(BaseModel):
    today: date
    current_streak: int
    longest_streak: int
    perfect_days: int
    today_total: int
    today_completed: int
    habits: list[HabitStats]


class CalendarDay(BaseModel):
    date: date
    total: int
    completed: int
    missed: int
    status: DayStatus


class WeekdayStat(BaseModel):
    weekday: int  # 0 = Monday, 6 = Sunday
    possible: int
    completed: int
    rate: float


class WeekStat(BaseModel):
    week_start: date
    possible: int
    completed: int
    rate: float


class Insights(BaseModel):
    weekdays: list[WeekdayStat]
    weeks: list[WeekStat]
