from datetime import date
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]
HabitName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Icon = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=16)]

MAX_SKIP_DATES = 366


def _normalize_weekdays(days: list[int]) -> list[int]:
    unique = sorted(set(days))
    if len(unique) == 7:
        raise ValueError("A habit must be scheduled on at least one weekday")
    return unique


def _normalize_dates(days: list[date]) -> list[date]:
    return sorted(set(days))


SkipWeekdays = Annotated[
    list[Annotated[int, Field(ge=0, le=6)]],
    AfterValidator(_normalize_weekdays),
    Field(description="Weekdays the habit is not required on (0 = Monday, 6 = Sunday)"),
]
SkipDates = Annotated[
    list[date],
    AfterValidator(_normalize_dates),
    Field(max_length=MAX_SKIP_DATES, description="Specific days the habit is not required on"),
]


class HabitCreate(BaseModel):
    name: HabitName
    description: Description | None = None
    color: HexColor = "#6366f1"
    icon: Icon = "✅"
    start_date: date | None = Field(default=None, description="Defaults to today")
    skip_weekdays: SkipWeekdays = []
    skip_dates: SkipDates = []


class HabitUpdate(BaseModel):
    name: HabitName | None = None
    description: Description | None = None
    color: HexColor | None = None
    icon: Icon | None = None
    start_date: date | None = None
    archived: bool | None = None
    skip_weekdays: SkipWeekdays | None = None
    skip_dates: SkipDates | None = Field(default=None, description="Replaces all skip dates")


class HabitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    color: str
    icon: str
    start_date: date
    archived_on: date | None
    is_archived: bool
    skip_weekdays: list[int]
    skip_dates: list[date]


class LogUpsert(BaseModel):
    completed: bool


class LogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    habit_id: int
    date: date
    completed: bool
