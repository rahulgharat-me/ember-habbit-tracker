#!/usr/bin/env bash
# Starts the backend (FastAPI) and frontend (Next.js) together. Ctrl+C stops both.
#
# Usage: ./start.sh          development mode (auto-reload)
#        ./start.sh --prod   production build of the frontend, no reload
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="dev"
[[ "${1:-}" == "--prod" ]] && MODE="prod"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# --- Install dependencies on first run -------------------------------------------------------
if [[ ! -f .env || ! -x .venv/bin/uvicorn || ! -x node_modules/.bin/next ]]; then
  info "Dependencies missing; running setup.sh first"
  ./setup.sh
fi

# --- Configuration (root .env) ---------------------------------------------------------------
set -a
# shellcheck disable=SC1091
source .env
set +a
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
export BACKEND_PORT FRONTEND_PORT
export HABIT_PUBLIC_URL="${HABIT_PUBLIC_URL:-http://localhost:$FRONTEND_PORT}"

if [[ -z "${HABIT_GITHUB_CLIENT_ID:-}" || -z "${HABIT_GITHUB_CLIENT_SECRET:-}" ]]; then
  printf '\033[1;33mwarning:\033[0m GitHub sign-in is not configured, so nobody can log in yet.\n'
  printf '         Create an OAuth app at https://github.com/settings/developers with callback URL\n'
  printf '         %s/api/auth/github/callback and put its ID/secret in .env.\n' "$HABIT_PUBLIC_URL"
fi

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  pid="$(lsof -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
  if [[ -n "$pid" ]]; then
    fail "Port $port is already in use by PID $pid ($(ps -o command= -p "$pid" | cut -c1-80)).
       Is the app already running? Stop it with: kill $pid
       Or change the port in .env."
  fi
done

# --- Process management ----------------------------------------------------------------------
cleanup() {
  trap - INT TERM EXIT
  echo
  info "Shutting down…"
  kill 0 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# --- Backend ---------------------------------------------------------------------------------
backend_args=(app.main:app --host 127.0.0.1 --port "$BACKEND_PORT")
[[ "$MODE" == "dev" ]] && backend_args+=(--reload)
info "Starting backend on http://localhost:$BACKEND_PORT"
(cd backend && exec ../.venv/bin/uvicorn "${backend_args[@]}") &

# --- Frontend --------------------------------------------------------------------------------
if [[ "$MODE" == "prod" ]]; then
  info "Building frontend"
  npm run build --workspace frontend
  info "Starting frontend on http://localhost:$FRONTEND_PORT"
  npm run start --workspace frontend -- --port "$FRONTEND_PORT" &
else
  info "Starting frontend on http://localhost:$FRONTEND_PORT"
  npm run dev --workspace frontend -- --port "$FRONTEND_PORT" &
fi

# --- Wait until both answer ------------------------------------------------------------------
wait_for() {
  local url="$1" name="$2"
  for _ in $(seq 1 120); do
    curl -fsS -o /dev/null "$url" 2>/dev/null && return 0
    sleep 0.5
  done
  fail "$name did not start (checked $url)."
}
wait_for "http://localhost:$BACKEND_PORT/api/health" "Backend"
wait_for "http://localhost:$FRONTEND_PORT" "Frontend"

cat <<EOF

  ✅ Habit Tracker is running
     App:      $HABIT_PUBLIC_URL
     API docs: $HABIT_PUBLIC_URL/docs

  Press Ctrl+C to stop.

EOF
wait
