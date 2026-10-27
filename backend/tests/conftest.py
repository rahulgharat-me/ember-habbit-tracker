import os
from collections.abc import Callable, Iterator

# Keep tests independent of the developer's .env (real database, credentials, public URL).
# Environment variables take precedence over .env; they must be set before the app is imported.
os.environ["HABIT_DATABASE_URL"] = "sqlite://"
os.environ["HABIT_GITHUB_CLIENT_ID"] = "test-client-id"
os.environ["HABIT_GITHUB_CLIENT_SECRET"] = "test-client-secret"
os.environ["HABIT_ALLOWED_GITHUB_USERS"] = ""
os.environ["HABIT_ADMIN_GITHUB_USERS"] = ""
os.environ["HABIT_SMTP_HOST"] = ""
os.environ["HABIT_NOTIFY_EMAIL"] = ""
os.environ["HABIT_PUBLIC_URL"] = "http://localhost:3000"
os.environ["HABIT_SESSION_DAYS"] = "30"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.api.deps import SESSION_COOKIE  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import create_db_engine, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services import auth_service  # noqa: E402
from app.services.github import GitHubUser  # noqa: E402


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_db_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def anon_client(db_session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def login_as(db_session: Session, anon_client: TestClient) -> Callable[[str], TestClient]:
    """Return a client signed in as the given GitHub login (each call gets its own client)."""

    def _login(login: str) -> TestClient:
        profile = GitHubUser(id=abs(hash(login)) % 10**9, login=login, name=None, avatar_url=None)
        user = auth_service.upsert_github_user(db_session, profile)
        token = auth_service.create_session(db_session, user, days=1)
        client = TestClient(app)
        client.cookies.set(SESSION_COOKIE, token)
        return client

    return _login


@pytest.fixture
def client(login_as: Callable[[str], TestClient]) -> TestClient:
    return login_as("octocat")
