from fastapi import APIRouter

from app.api.routes import admin, auth, habits, logs, stats

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(habits.router)
api_router.include_router(logs.router)
api_router.include_router(stats.router)


@api_router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
