from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Owner. Nullable only for habits created before sign-in existed; the first user to sign in
    # claims them (see auth_service.claim_unowned_habits).
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, default=None
    )
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500), default=None)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")
    icon: Mapped[str] = mapped_column(String(16), default="✅")
    # First day the habit counts towards streaks.
    start_date: Mapped[date] = mapped_column(Date)
    # First day the habit no longer counts (exclusive). ``None`` means active.
    archived_on: Mapped[date | None] = mapped_column(Date, default=None)
    # Weekdays the habit is not required on (0 = Monday … 6 = Sunday).
    skip_weekdays: Mapped[list[int]] = mapped_column(JSON, default=list, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    logs: Mapped[list["HabitLog"]] = relationship(
        back_populates="habit", cascade="all, delete-orphan", passive_deletes=True
    )
    skip_date_entries: Mapped[list["HabitSkipDate"]] = relationship(
        back_populates="habit",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
        order_by="HabitSkipDate.date",
    )

    @property
    def is_archived(self) -> bool:
        return self.archived_on is not None

    @property
    def skip_dates(self) -> list[date]:
        return [entry.date for entry in self.skip_date_entries]

    def is_tracked_on(self, day: date) -> bool:
        return self.start_date <= day and (self.archived_on is None or day < self.archived_on)

    def is_scheduled_on(self, day: date) -> bool:
        return (
            self.is_tracked_on(day)
            and day.weekday() not in self.skip_weekdays
            and day not in self.skip_dates
        )


class HabitLog(Base):
    __tablename__ = "habit_logs"
    __table_args__ = (UniqueConstraint("habit_id", "date", name="uq_habit_log_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habits.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    completed: Mapped[bool] = mapped_column(Boolean)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    habit: Mapped[Habit] = relationship(back_populates="logs")


class HabitSkipDate(Base):
    """A specific day on which a habit is not required (holiday, sick day, …)."""

    __tablename__ = "habit_skip_dates"
    __table_args__ = (UniqueConstraint("habit_id", "date", name="uq_habit_skip_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habits.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date)

    habit: Mapped[Habit] = relationship(back_populates="skip_date_entries")
