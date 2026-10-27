"""Habit exceptions: weekly days off and specific skip dates.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Guarded so databases partly created by the pre-migration ``create_all`` still upgrade.
    inspector = sa.inspect(op.get_bind())
    if "skip_weekdays" not in {c["name"] for c in inspector.get_columns("habits")}:
        with op.batch_alter_table("habits") as batch:
            batch.add_column(
                sa.Column("skip_weekdays", sa.JSON(), server_default="[]", nullable=False)
            )

    if inspector.has_table("habit_skip_dates"):
        return
    op.create_table(
        "habit_skip_dates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("habit_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["habit_id"], ["habits.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("habit_id", "date", name="uq_habit_skip_day"),
    )
    op.create_index("ix_habit_skip_dates_habit_id", "habit_skip_dates", ["habit_id"])


def downgrade() -> None:
    op.drop_index("ix_habit_skip_dates_habit_id", table_name="habit_skip_dates")
    op.drop_table("habit_skip_dates")
    with op.batch_alter_table("habits") as batch:
        batch.drop_column("skip_weekdays")
