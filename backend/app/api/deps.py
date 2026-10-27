from datetime import date
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User
from app.services import auth_service

SESSION_COOKIE = "habit_session"

DbSession = Annotated[Session, Depends(get_db)]


def get_today(
    today: Annotated[
        date | None,
        Query(description="Client's local date; defaults to the server's date"),
    ] = None,
) -> date:
    return today or date.today()


Today = Annotated[date, Depends(get_today)]


def get_current_user(
    db: DbSession,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> User:
    user = auth_service.get_user_for_token(db, session_token) if session_token else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
