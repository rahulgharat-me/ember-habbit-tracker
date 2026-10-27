<p align="center"><img src="frontend/public/logo.svg" width="72" alt="Ember logo"></p>

# Ember

**Keep your streak alive.** Ember is a daily habit tracker: mark each habit done or missed, and
build a streak of perfect days.

**Stack:** Python (FastAPI + SQLAlchemy) · SQLite · Next.js 15 (App Router, TypeScript, Tailwind CSS 4)

**UI:** [lucide](https://lucide.dev) icons · [Radix UI](https://www.radix-ui.com) primitives
(dropdown, dialog) · [motion](https://motion.dev) animations · [sonner](https://sonner.emilkowal.ski)
toasts · [next-themes](https://github.com/pacocoursey/next-themes) light/dark/system theme ·
canvas-confetti for perfect days. Installable as a home-screen app via the web manifest.

## Quick start

```bash
./setup.sh   # once per machine: creates .env, .venv/ and node_modules/
```

**Set up GitHub sign-in (once).** GitHub is the only way to sign in. Create an OAuth app at
<https://github.com/settings/developers> → **New OAuth App**:

| Field                      | Value                                            |
| -------------------------- | ------------------------------------------------ |
| Homepage URL               | `http://localhost:3000`                          |
| Authorization callback URL | `http://localhost:3000/api/auth/github/callback` |

Copy the **Client ID** and a newly generated **Client secret** into `.env`:

```
HABIT_GITHUB_CLIENT_ID=...
HABIT_GITHUB_CLIENT_SECRET=...
```

Then start the app:

```bash
./start.sh   # starts backend + frontend (runs setup.sh automatically if needed)
```

- App: http://localhost:3000
- API docs: http://localhost:8000/docs

`./start.sh --prod` builds the frontend and runs both servers without auto-reload.
Press `Ctrl+C` to stop everything.

**Requirements:** Python 3.11+, Node.js 20+.

## Sign-in and accounts

- **Sign in with GitHub** is the only sign-in method. The app reads only your public profile
  (username and avatar), with no repository or email access.
- Each GitHub account has its own habits. Habits created before sign-in existed are assigned to the
  first account that signs in.
- Restrict who can sign in with `HABIT_ALLOWED_GITHUB_USERS=alice,bob`. Leave it empty to allow
  any GitHub account (each still sees only their own data).
- Sessions last 30 days (`HABIT_SESSION_DAYS`) and are stored server-side. The cookie is
  `HttpOnly`, `SameSite=Lax`, and `Secure` when `HABIT_PUBLIC_URL` is `https://`.
- The browser only talks to the Next.js app, which proxies `/api/*` to FastAPI. The backend
  listens on `127.0.0.1` only.

## Invite-only mode and access requests

Setting `HABIT_ALLOWED_GITHUB_USERS` or `HABIT_ADMIN_GITHUB_USERS` makes the app invite-only.
People in `HABIT_ALLOWED_GITHUB_USERS` sign in directly with GitHub, no approval needed; everyone
else has to ask:

1. On the login page, a visitor clicks **Request access** and confirms who they are with GitHub.
   Nobody can request access on someone else's behalf.
2. Admins (`HABIT_ADMIN_GITHUB_USERS`) see a badge on their avatar. **Account menu → Access
   requests** lists pending, approved and declined requests. Only admins can review requests.
   Admins can also be emailed (below).
3. **Approve** lets the person sign in. **Decline** refuses the request. **Revoke** removes access
   later and signs them out on every device; their habits are kept. Declined people can request
   again.

Approvals are stored in the database, so you don't need to edit `.env` or restart. People listed in
`HABIT_ALLOWED_GITHUB_USERS` and admins can always sign in.

### Email notifications

New requests can also be emailed to `HABIT_NOTIFY_EMAIL` through any SMTP server. If SMTP isn't
configured or fails, no email is sent; the request is still recorded and the in-app badge still
works. Free options:

| Provider | Free tier (check current terms) | SMTP settings |
| --- | --- | --- |
| [Resend](https://resend.com) | 3,000/month, 100/day | `smtp.resend.com`, port 465 or 587, user `resend`, password = API key |
| [Brevo](https://www.brevo.com) | 300/day | `smtp-relay.brevo.com`, port 587, user/password = SMTP login and key from the dashboard |
| Gmail | about 500/day | `smtp.gmail.com`, port 587, user = your address, password = an [App Password](https://myaccount.google.com/apppasswords) (needs 2-Step Verification) |

With Resend or Brevo, verify your domain in their dashboard (add the DNS records they show you, for
SPF/DKIM) and send from an address on it, e.g. `HABIT_SMTP_FROM=Ember <noreply@yourdomain.com>`.

## Features

| Page         | What it does                                                                               |
| ------------ | ------------------------------------------------------------------------------------------ |
| **Today**    | Mark each habit ✓ done or ✕ missed (click again to clear). Go back to edit past days. Shows current/best streak, perfect days and today's progress. |
| **Calendar** | Month view colored by day status (all done / partly / missed / in progress). Click a day to edit it. Filter by a single habit. |
| **Insights** | Year heatmap, completion by weekday, weekly trend for 12 weeks, and a leaderboard per habit. |
| **Habits**   | Add, edit, archive or restore, and delete habits (name, description, icon, color, start date, schedule, days off). |

**First run.** New users get a welcome screen with one-tap starter habits, then a short guided tour
of the Today page (streak, check-ins, days off, past days, navigation). Replay it from **Account
menu → Take the tour**.

### Streak rules

- A **perfect day** means every habit active that day is marked done.
- The **streak** is the number of perfect days in a row, ending today.
- Today counts as in progress: an unfinished today does not break the streak until the day is over.
- Missing any habit on a past day, or leaving it unmarked, breaks the streak.
- A habit counts from its **start date**, so adding a new habit does not affect earlier days.
- **Archiving** a habit stops it from counting from that day on. Its history is kept.

### Exceptions (days off)

A habit isn't required on a day off. A day off neither breaks nor extends a streak. There are two kinds:

- **Weekly schedule.** "Repeat on" picks the weekdays a habit applies to, for example every day
  except Sunday. Presets: Every day, Weekdays, Weekends.
- **Specific dates.** One-off days off such as holidays or sick days. Add them in the habit form,
  including future dates, or press **Day off** next to a habit on the Today or Calendar page.
  **Undo** removes it.

If no habit is scheduled on a day, it is a **rest day**: it is shown as "Day off" in the calendar,
and the streak carries over it. Days off are left out of completion rates.

## Project structure

```
.
├── .env / .env.example     # single shared config (ports, API URL, DB path)
├── data/habits.db          # SQLite database: all your data (created on first run, git-ignored)
├── .venv/                  # Python virtualenv (created by setup.sh)
├── node_modules/           # Node deps, hoisted via npm workspaces
├── package.json            # npm workspace root
├── setup.sh                # install all dependencies
├── start.sh                # run backend + frontend
├── backend/
│   ├── app/
│   │   ├── main.py         # app factory, error handlers
│   │   ├── core/           # settings, domain exceptions
│   │   ├── db/             # engine, session, declarative base
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── services/       # business logic (streaks.py holds the pure functions)
│   │   └── api/            # routers (habits, logs, stats), dependencies
│   ├── migrations/         # Alembic migrations (applied automatically on startup)
│   ├── tests/              # pytest: streak unit tests, API tests, migration tests
│   └── requirements*.txt
└── frontend/
    ├── public/             # logo.svg and home-screen icons
    └── src/
        ├── app/            # routes (/, /calendar, /insights, /habits, /login, /about), 404, error page,
        │                   # favicon (icon.svg), apple-icon, opengraph-image, manifest
        ├── components/     # UI kit (ui.tsx), Nav, Logo, Onboarding, Tour, DayChecklist, charts…
        ├── hooks/          # useAsync, useToday, useCurrentUser, useTour
        └── lib/            # typed API client, types, dates, brand name (brand.ts), cn()
```

## API

All endpoints except `/api/health` and `/api/auth/*` require a signed-in session.

| Method | Path                                    | Description                         |
| ------ | --------------------------------------- | ----------------------------------- |
| GET    | `/api/auth/github/login?intent=`        | Start sign-in, or `intent=request` to ask for access |
| GET    | `/api/auth/github/callback`             | OAuth callback (sets session cookie) |
| GET    | `/api/auth/me`                          | Current user                        |
| POST   | `/api/auth/logout`                      | Sign out                            |
| GET    | `/api/auth/config`                      | Whether the app is invite-only (public) |
| GET    | `/api/admin/access-requests?status=`    | List access requests (admins)       |
| POST   | `/api/admin/access-requests/{id}`       | `{"status": "approved"\|"denied"\|"revoked"}` (admins) |
| GET    | `/api/habits?include_archived=`         | List habits                         |
| POST   | `/api/habits`                           | Create a habit                      |
| PATCH  | `/api/habits/{id}`                      | Update, archive (`{"archived": true}`) or restore a habit |
| DELETE | `/api/habits/{id}`                      | Delete a habit and its history      |
| PUT    | `/api/habits/{id}/logs/{date}`          | Mark a day `{"completed": true\|false}` |
| DELETE | `/api/habits/{id}/logs/{date}`          | Clear a day's mark                  |
| PUT    | `/api/habits/{id}/skips/{date}`         | Add a specific day off              |
| DELETE | `/api/habits/{id}/skips/{date}`         | Remove a specific day off           |
| GET    | `/api/logs?start=&end=&habit_id=`       | Logs in a date range                |
| GET    | `/api/stats/summary?today=`             | Streaks, perfect days, per-habit stats |
| GET    | `/api/stats/calendar?start=&end=&today=&habit_id=` | Status for each day       |
| GET    | `/api/stats/insights?today=&days=&weeks=` | Weekday and weekly completion rates |

The frontend sends `today` as the browser's local date, so streaks follow your time zone.

## Development

```bash
# Backend
cd backend
../.venv/bin/pytest            # tests
../.venv/bin/ruff check .      # lint
../.venv/bin/ruff format .     # format

# Frontend (from the root)
npm run lint
npm run typecheck
npm run format         # Prettier + Tailwind class sorting
npm run build
```

### Database migrations

The schema is managed with Alembic, and the API applies pending migrations when it starts.
After changing a model, create a migration:

```bash
cd backend
../.venv/bin/alembic revision --autogenerate -m "describe the change"
```

Review the generated file in `migrations/versions/`. `tests/test_migrations.py` fails if the
migrations and models drift apart.

### Your data

Everything is stored in `data/habits.db`, a single SQLite file. It persists across restarts and
upgrades. The file is git-ignored, so copy it yourself when moving to another machine. To back it
up while the app is running:

```bash
sqlite3 data/habits.db ".backup 'habits-backup.db'"
```

### Configuration

All settings live in the root `.env` (see `.env.example`). Backend variables use the `HABIT_` prefix
(`HABIT_GITHUB_CLIENT_ID`, `HABIT_GITHUB_CLIENT_SECRET`, `HABIT_ALLOWED_GITHUB_USERS`,
`HABIT_PUBLIC_URL`, `HABIT_DATABASE_URL`). `NEXT_PUBLIC_REPO_URL` adds a "View source on GitHub"
button to the public About page (`/about`, linked from the login page). `start.sh` reads `BACKEND_PORT` and `FRONTEND_PORT`.
When deploying, set `HABIT_PUBLIC_URL` to the public `https://` address and update the OAuth app's
URLs to match.

### Next steps for a growing project

- Add frontend tests with Vitest and Playwright.
