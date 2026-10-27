from datetime import date, timedelta

from fastapi.testclient import TestClient

TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)


def create_habit(client: TestClient, name: str, start: date = YESTERDAY) -> dict:
    response = client.post("/api/habits", json={"name": name, "start_date": start.isoformat()})
    assert response.status_code == 201, response.text
    return response.json()


def mark(client: TestClient, habit_id: int, day: date, completed: bool = True) -> None:
    response = client.put(f"/api/habits/{habit_id}/logs/{day}", json={"completed": completed})
    assert response.status_code == 200, response.text


def test_health(client: TestClient):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_habit_crud(client: TestClient):
    habit = create_habit(client, "  Read  ")
    assert habit["name"] == "Read"
    assert habit["is_archived"] is False

    response = client.patch(f"/api/habits/{habit['id']}", json={"name": "Read 20 pages"})
    assert response.json()["name"] == "Read 20 pages"

    response = client.patch(f"/api/habits/{habit['id']}", json={"archived": True})
    assert response.json()["is_archived"] is True
    assert client.get("/api/habits").json() == []
    assert len(client.get("/api/habits", params={"include_archived": True}).json()) == 1

    assert client.delete(f"/api/habits/{habit['id']}").status_code == 204
    assert client.get(f"/api/habits/{habit['id']}").status_code == 404


def test_validation(client: TestClient):
    assert client.post("/api/habits", json={"name": ""}).status_code == 422
    assert client.post("/api/habits", json={"name": "x", "color": "red"}).status_code == 422

    habit = create_habit(client, "Run", start=TODAY)
    response = client.put(f"/api/habits/{habit['id']}/logs/{YESTERDAY}", json={"completed": True})
    assert response.status_code == 422
    assert "starts on" in response.json()["detail"]

    future = TODAY + timedelta(days=5)
    response = client.put(f"/api/habits/{habit['id']}/logs/{future}", json={"completed": True})
    assert response.status_code == 422


def test_logs_and_summary(client: TestClient):
    read = create_habit(client, "Read")
    run = create_habit(client, "Run")
    for habit_id in (read["id"], run["id"]):
        mark(client, habit_id, YESTERDAY)
    mark(client, read["id"], TODAY)
    mark(client, run["id"], TODAY, completed=False)

    logs = client.get("/api/logs", params={"start": YESTERDAY, "end": TODAY}).json()
    assert len(logs) == 4

    summary = client.get("/api/stats/summary", params={"today": TODAY}).json()
    assert summary["current_streak"] == 1
    assert summary["today_total"] == 2
    assert summary["today_completed"] == 1

    # Changing the mark updates the existing log rather than adding a new one.
    mark(client, run["id"], TODAY)
    summary = client.get("/api/stats/summary", params={"today": TODAY}).json()
    assert summary["current_streak"] == 2
    assert summary["longest_streak"] == 2

    assert client.delete(f"/api/habits/{run['id']}/logs/{TODAY}").status_code == 204
    summary = client.get("/api/stats/summary", params={"today": TODAY}).json()
    assert summary["current_streak"] == 1


def test_calendar_and_insights(client: TestClient):
    habit = create_habit(client, "Meditate")
    mark(client, habit["id"], YESTERDAY)

    params = {"start": YESTERDAY - timedelta(days=1), "end": TODAY + timedelta(days=1)}
    days = client.get("/api/stats/calendar", params={**params, "today": TODAY}).json()
    assert [d["status"] for d in days] == ["empty", "complete", "pending", "future"]

    insights = client.get("/api/stats/insights", params={"today": TODAY}).json()
    assert len(insights["weekdays"]) == 7
    assert len(insights["weeks"]) == 12


def test_weekday_and_date_exceptions(client: TestClient):
    start = TODAY - timedelta(days=13)
    skip_weekday = YESTERDAY.weekday()
    response = client.post(
        "/api/habits",
        json={"name": "Gym", "start_date": start.isoformat(), "skip_weekdays": [skip_weekday]},
    )
    assert response.status_code == 201, response.text
    habit = response.json()
    assert habit["skip_weekdays"] == [skip_weekday]

    # Logging on a day off is rejected.
    response = client.put(f"/api/habits/{habit['id']}/logs/{YESTERDAY}", json={"completed": True})
    assert response.status_code == 422

    # Specific dates can be added (also in the future) and removed.
    two_days_ago = TODAY - timedelta(days=2)
    holiday = TODAY + timedelta(days=10)
    for day in (two_days_ago, holiday):
        assert client.put(f"/api/habits/{habit['id']}/skips/{day}").status_code == 200
    habit = client.get(f"/api/habits/{habit['id']}").json()
    assert habit["skip_dates"] == [two_days_ago.isoformat(), holiday.isoformat()]

    mark(client, habit["id"], TODAY)
    mark(client, habit["id"], TODAY - timedelta(days=3))
    summary = client.get("/api/stats/summary", params={"today": TODAY}).json()
    # today + (2 days ago skipped) + (yesterday off) + 3 days ago
    assert summary["current_streak"] == 2

    days = client.get(
        "/api/stats/calendar", params={"start": YESTERDAY, "end": YESTERDAY, "today": TODAY}
    ).json()
    assert days[0]["status"] == "rest"

    response = client.delete(f"/api/habits/{habit['id']}/skips/{holiday}")
    assert response.json()["skip_dates"] == [two_days_ago.isoformat()]

    response = client.patch(
        f"/api/habits/{habit['id']}", json={"skip_dates": [], "skip_weekdays": []}
    )
    assert response.json()["skip_dates"] == []
    assert response.json()["skip_weekdays"] == []


def test_cannot_skip_every_weekday(client: TestClient):
    response = client.post("/api/habits", json={"name": "Never", "skip_weekdays": list(range(7))})
    assert response.status_code == 422
