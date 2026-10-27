from datetime import date
from pathlib import Path

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import text

from app import models  # noqa: F401
from app.db.base import Base
from app.db.migrations import upgrade_database
from app.db.session import create_db_engine


def test_migrations_match_models(tmp_path: Path):
    engine = create_db_engine(f"sqlite:///{tmp_path / 'fresh.db'}")
    upgrade_database(engine)
    with engine.connect() as connection:
        diff = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    assert diff == []


def test_upgrades_database_created_before_migrations(tmp_path: Path):
    engine = create_db_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    # The original schema, created with create_all and without an alembic_version table.
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE habits (id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL, "
                "description VARCHAR(500), color VARCHAR(7) NOT NULL, icon VARCHAR(16) NOT NULL, "
                "start_date DATE NOT NULL, archived_on DATE, "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO habits (name, color, icon, start_date) "
                f"VALUES ('Read', '#6366f1', 'x', '{date.today()}')"
            )
        )

    upgrade_database(engine)

    with engine.connect() as connection:
        row = connection.execute(text("SELECT name, skip_weekdays FROM habits")).one()
        version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar()
    assert tuple(row) == ("Read", "[]")
    assert version == "0004"


def test_upgrades_partially_created_database(tmp_path: Path):
    """Old ``create_all`` ran with newer models: extra table, missing column, empty version."""
    engine = create_db_engine(f"sqlite:///{tmp_path / 'partial.db'}")
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE habits (id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL, "
                "description VARCHAR(500), color VARCHAR(7) NOT NULL, icon VARCHAR(16) NOT NULL, "
                "start_date DATE NOT NULL, archived_on DATE, "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL)"
            )
        )
        connection.execute(
            text(
                "CREATE TABLE habit_skip_dates (id INTEGER PRIMARY KEY, habit_id INTEGER NOT NULL "
                "REFERENCES habits (id) ON DELETE CASCADE, date DATE NOT NULL, "
                "CONSTRAINT uq_habit_skip_day UNIQUE (habit_id, date))"
            )
        )
        connection.execute(
            text("CREATE INDEX ix_habit_skip_dates_habit_id ON habit_skip_dates (habit_id)")
        )
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))

    upgrade_database(engine)

    with engine.connect() as connection:
        version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar()
        columns = {row[1] for row in connection.execute(text("PRAGMA table_info(habits)"))}
    assert version == "0004"
    assert "skip_weekdays" in columns
