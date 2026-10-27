#!/usr/bin/env bash
# Installs everything needed to run the project on a fresh machine:
#   - .env               (copied from .env.example if missing)
#   - .venv/             Python virtualenv with backend dependencies
#   - node_modules/      Node dependencies (npm workspace, hoisted to the root)
#
# Usage: ./setup.sh [--prod]   (--prod skips Python dev tools such as pytest/ruff)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PYTHON="${PYTHON:-python3}"
MIN_PYTHON="3.11"
MIN_NODE_MAJOR=20
REQUIREMENTS="backend/requirements-dev.txt"
[[ "${1:-}" == "--prod" ]] && REQUIREMENTS="backend/requirements.txt"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# prerequisites
command -v "$PYTHON" >/dev/null || fail "$PYTHON not found. Install Python $MIN_PYTHON+."
"$PYTHON" -c "import sys; sys.exit(sys.version_info < tuple(map(int, '$MIN_PYTHON'.split('.'))))" \
  || fail "Python $MIN_PYTHON+ required (found $("$PYTHON" --version 2>&1))."

command -v node >/dev/null || fail "node not found. Install Node.js $MIN_NODE_MAJOR+."
command -v npm >/dev/null || fail "npm not found."
node_major="$(node -p 'process.versions.node.split(".")[0]')"
(( node_major >= MIN_NODE_MAJOR )) || fail "Node.js $MIN_NODE_MAJOR+ required (found $(node --version))."

# environment file
if [[ ! -f .env ]]; then
  info "Creating .env from .env.example"
  cp .env.example .env
fi

# python
if [[ ! -x .venv/bin/python ]]; then
  info "Creating Python virtualenv in .venv ($("$PYTHON" --version))"
  "$PYTHON" -m venv .venv
fi
info "Installing Python dependencies from $REQUIREMENTS"
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet -r "$REQUIREMENTS"

# node
info "Installing Node dependencies into node_modules"
if [[ -f package-lock.json ]]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

info "Setup complete. Run ./start.sh to launch the app."
