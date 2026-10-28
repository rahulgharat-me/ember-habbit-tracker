#!/usr/bin/env bash
# Starts the backend (FastAPI) and frontend (Next.js) together. Ctrl+C stops both.
#
# Usage: ./start.sh          development mode: code changes reload each app, and editing .env
#                            restarts both
#        ./start.sh --prod   production build of the frontend, no reload
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="dev"
[[ "${1:-}" == "--prod" ]] && MODE="prod"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# install dependencies on first run
if [[ ! -f .env || ! -x .venv/bin/uvicorn || ! -x node_modules/.bin/next ]]; then
  info "Dependencies missing; running setup.sh first"
  ./setup.sh
fi

# configuration (root .env)
ENV_VARS=()
load_env() {
  # Forget values from the previous load, so a line removed from .env is really gone.
  if ((${#ENV_VARS[@]})); then unset "${ENV_VARS[@]}"; fi
  # shellcheck disable=SC2207
  ENV_VARS=($(sed -nE 's/^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=.*/\2/p' .env))
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  BACKEND_PORT="${BACKEND_PORT:-8000}"
  FRONTEND_PORT="${FRONTEND_PORT:-3000}"
  export BACKEND_PORT FRONTEND_PORT
  export HABIT_PUBLIC_URL="${HABIT_PUBLIC_URL:-http://localhost:$FRONTEND_PORT}"
}
load_env

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

# process management
cleanup() {
  trap - INT TERM EXIT
  echo
  info "Shutting down…"
  kill 0 2>/dev/null || true
}
trap cleanup INT TERM EXIT

start_servers() {
  # backend
  local backend_args=(app.main:app --host 127.0.0.1 --port "$BACKEND_PORT")
  [[ "$MODE" == "dev" ]] && backend_args+=(--reload)
  info "Starting backend on http://localhost:$BACKEND_PORT"
  (cd backend && exec ../.venv/bin/uvicorn "${backend_args[@]}") &
  BACKEND_PID=$!

  # frontend
  if [[ "$MODE" == "prod" ]]; then
    info "Building frontend"
    npm run build --workspace frontend
    info "Starting frontend on http://localhost:$FRONTEND_PORT"
    npm run start --workspace frontend -- --port "$FRONTEND_PORT" &
  else
    info "Starting frontend on http://localhost:$FRONTEND_PORT"
    npm run dev --workspace frontend -- --port "$FRONTEND_PORT" &
  fi
  FRONTEND_PID=$!
}

# Stops a process and everything it started (npm → next, uvicorn → its reload worker).
kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$child"; done
  kill "$1" 2>/dev/null || true
}

stop_servers() {
  kill_tree "$BACKEND_PID"
  kill_tree "$FRONTEND_PID"
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

start_servers

# wait until both answer
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

if [[ "$MODE" == "prod" ]]; then
  wait
  exit
fi

# dev: each app reloads its own code; a change to .env restarts both with the new values.
env_mtime() { stat -f %m .env 2>/dev/null || stat -c %Y .env; }
last_mtime="$(env_mtime)"
while sleep 1; do
  mtime="$(env_mtime)"
  [[ "$mtime" == "$last_mtime" ]] && continue
  last_mtime="$mtime"
  info ".env changed; restarting backend and frontend"
  stop_servers
  load_env
  start_servers
  wait_for "http://localhost:$BACKEND_PORT/api/health" "Backend"
  wait_for "http://localhost:$FRONTEND_PORT" "Frontend"
  info "Restarted: $HABIT_PUBLIC_URL"
done
