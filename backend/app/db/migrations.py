"""Applies Alembic migrations programmatically (called on API startup)."""

from alembic import command
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import Engine, inspect

from app.core.config import BACKEND_DIR

# Revision matching the schema that older versions created with ``create_all``.
BASELINE_REVISION = "0001"


def upgrade_database(engine: Engine) -> None:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        has_tables = inspect(connection).has_table("habits")
        current = MigrationContext.configure(connection).get_current_revision()
        if has_tables and current is None:
            # Database predates migrations: record it as the baseline, then upgrade.
            command.stamp(config, BASELINE_REVISION)
        command.upgrade(config, "head")
