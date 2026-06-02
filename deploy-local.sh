#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# deploy-local.sh — Set up and run निवेश Path locally
#
# Creates a Python venv (if needed), installs backend + frontend deps,
# frees ports 5000/5173, and starts Flask + Vite dev servers.
#
# Usage:
#   ./deploy-local.sh [--skip-install]
#
# Options:
#   --skip-install    Skip venv/npm setup; only free ports and start servers
#
# After running, the app is available at:
#   Frontend: http://localhost:5173
#   Backend:  http://localhost:5000  (proxied as /api from Vite)
#
# Requirements:
#   - Python 3.8+ and Node.js 16+
#   - Optional: frontend/.env (copy from frontend/.env.example if present)
# ---------------------------------------------------------------------------
set -euo pipefail

# ── Parse arguments ───────────────────────────────────────────────────────
SKIP_INSTALL=false

for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=true ;;
    -*)             echo "Unknown option: $arg" >&2; exit 1 ;;
    *)              echo "Unexpected argument: $arg" >&2
                    echo "Usage: ./deploy-local.sh [--skip-install]" >&2
                    exit 1
                    ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$REPO_ROOT/.venv"
BACKEND_PORT=5000
FRONTEND_PORT=5173

echo "╭─────────────────────────────────────────────╮"
echo "│  निवेश Path — Local Development Setup      │"
echo "╰─────────────────────────────────────────────╯"
echo ""

# ── Optional frontend env ─────────────────────────────────────────────────
if [ ! -f "$REPO_ROOT/frontend/.env" ]; then
  echo "  · frontend/.env not found (Vite will use defaults; API proxy → :5000)"
  echo ""
fi

# ── Find Python 3.8+ ──────────────────────────────────────────────────────
find_python() {
  for cmd in python3.13 python3.12 python3.11 python3.10 python3.9 python3.8 python3; do
    if command -v "$cmd" >/dev/null 2>&1; then
      local ver major minor
      ver=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null) || continue
      major="${ver%%.*}"
      minor="${ver#*.}"
      if [ "${major:-0}" -ge 3 ] && [ "${minor:-0}" -ge 8 ]; then
        echo "$cmd"
        return 0
      fi
    fi
  done
  return 1
}

if [ "$SKIP_INSTALL" = false ]; then
  echo "  ┌─ Dependencies ─────────────────────────────"

  PYTHON_CMD=$(find_python) || {
    echo "  │  ✗ Python 3.8+ not found."
    echo "  │    macOS: brew install python@3.12"
    echo "  └────────────────────────────────────────────"
    exit 1
  }
  PYTHON_VER=$($PYTHON_CMD --version 2>&1)
  echo "  │  Python: $PYTHON_VER"

  if ! command -v node >/dev/null 2>&1; then
    echo "  │  ✗ Node.js not found. Install Node 16+ first."
    echo "  └────────────────────────────────────────────"
    exit 1
  fi
  echo "  │  Node:   $(node --version) ($(command -v node))"

  # Python venv + backend deps
  if [ ! -f "$VENV_DIR/bin/activate" ]; then
    echo "  │  Creating virtual environment..."
    "$PYTHON_CMD" -m venv "$VENV_DIR"
  fi
  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"
  pip install -q --upgrade pip 2>/dev/null || true
  pip install -q -r "$REPO_ROOT/backend/requirements.txt"
  echo "  │  ✓ Backend packages installed"

  # Frontend deps
  if [ ! -d "$REPO_ROOT/frontend/node_modules" ]; then
    (cd "$REPO_ROOT/frontend" && npm install --silent)
    echo "  │  ✓ Frontend packages installed"
  else
    echo "  │  ✓ Frontend: node_modules present"
  fi

  echo "  └────────────────────────────────────────────"
  echo ""
else
  echo "  Skipping dependency setup (--skip-install)"
  echo ""
  if [ ! -f "$VENV_DIR/bin/activate" ]; then
    echo "ERROR: No .venv found. Run without --skip-install first." >&2
    exit 1
  fi
  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"
fi

# ── Free ports ──────────────────────────────────────────────────────────────
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Killing process(es) on port $port (PIDs: $pids)"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

echo "  Checking ports..."
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"
echo "  ✓ Ports $BACKEND_PORT & $FRONTEND_PORT are free"
echo ""

# ── Start servers ───────────────────────────────────────────────────────────
cleanup() {
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}

echo "  ┌─ Starting ──────────────────────────────────"
echo "  │  Backend:  http://localhost:${BACKEND_PORT}"
echo "  │  Frontend: http://localhost:${FRONTEND_PORT}"
echo "  │  Press Ctrl+C to stop."
echo "  └────────────────────────────────────────────"
echo ""

(cd "$REPO_ROOT/backend" && python app.py) &
BACKEND_PID=$!

trap cleanup INT TERM

(cd "$REPO_ROOT/frontend" && npm run dev -- --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
