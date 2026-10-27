"""Application settings, loaded from environment variables (prefix ``HABIT_``) or ``.env``."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="HABIT_",
        env_file=PROJECT_ROOT / ".env",
        extra="ignore",
    )

    app_name: str = "Habit Tracker API"
    database_url: str = f"sqlite:///{PROJECT_ROOT / 'data' / 'habits.db'}"

    # URL users open in the browser (the Next.js app, which proxies /api to this backend).
    public_url: str = "http://localhost:3000"

    # GitHub OAuth app: https://github.com/settings/developers
    github_client_id: str = ""
    github_client_secret: str = ""
    # Comma-separated GitHub usernames who sign in directly. When this or the admin list is set,
    # the app is invite-only: others can request access, which admins review.
    allowed_github_users: str = ""
    # Comma-separated GitHub usernames who review access requests (and can always sign in).
    admin_github_users: str = ""

    session_days: int = 30

    # Email notifications for new access requests (optional; skipped unless host and to are set).
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    notify_email: str = ""

    @staticmethod
    def _logins(value: str) -> set[str]:
        return {u.strip().lower() for u in value.split(",") if u.strip()}

    @property
    def invite_only(self) -> bool:
        return bool(self._logins(self.allowed_github_users) | self._logins(self.admin_github_users))

    def is_admin(self, login: str) -> bool:
        return login.lower() in self._logins(self.admin_github_users)

    @property
    def email_configured(self) -> bool:
        return bool(self.smtp_host and self.notify_email)

    @property
    def github_configured(self) -> bool:
        return bool(self.github_client_id and self.github_client_secret)

    @property
    def github_callback_url(self) -> str:
        return f"{self.public_url.rstrip('/')}/api/auth/github/callback"

    @property
    def secure_cookies(self) -> bool:
        return self.public_url.startswith("https://")

    def is_github_user_allowed(self, login: str) -> bool:
        """Static check from configuration only (approved requests live in the database)."""
        return (
            not self.invite_only
            or login.lower() in self._logins(self.allowed_github_users)
            or self.is_admin(login)
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
