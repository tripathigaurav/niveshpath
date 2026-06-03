#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# deploy-local.sh — Set up and run निवेश Path locally
#
# Creates a Python venv (if needed), installs backend + frontend deps,
# picks free ports (does NOT kill other apps), and starts Flask + Vite.
#
# Usage:
#   ./deploy-local.sh [--skip-install] [--backend-port N] [--frontend-port N]
#
# Options:
#   --skip-install       Skip venv/npm setup; only start servers
#   --backend-port N     Prefer backend port N (default 5000; uses next free if busy)
#   --frontend-port N    Prefer frontend port N (default 5199; uses next free if busy)
#   --kill-ports         Kill processes on preferred ports before starting (destructive)
#
# Default ports (auto-increment if busy — safe alongside other projects):
#   Backend:  5000 → 5001 → …
#   Frontend: 5199 → 5200 → …  (avoids Vite default 5173 used by other apps)
#
# URLs are printed at startup and saved to .local-dev-ports in the repo root.
#
# Requirements:
#   - Python 3.8+ and Node.js 16+
#   - Optional: frontend/.env (see frontend/.env.example)
# ---------------------------------------------------------------------------
set -euo pipefail

SKIP_INSTALL=false
KILL_PORTS=false
BACKEND_PORT_PREF=5000
FRONTEND_PORT_PREF=5199

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-install)   SKIP_INSTALL=true ;;
    --kill-ports)     KILL_PORTS=true ;;
    --backend-port)
      shift
      BACKEND_PORT_PREF="${1:?--backend-port requires a number}"
      ;;
    --frontend-port)
      shift
      FRONTEND_PORT_PREF="${1:?--frontend-port requires a number}"
      ;;
    -h|--help)
      sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*) echo "Unknown option: $1" >&2; echo "Try: ./deploy-local.sh --help" >&2; exit 1 ;;
    *)  echo "Unexpected argument: $1" >&2; exit 1 ;;
  esac
  shift
done

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$REPO_ROOT/.venv"
PORTS_FILE="$REPO_ROOT/.local-dev-ports"

echo "╭─────────────────────────────────────────────╮"
echo "│  निवेश Path — Local Development Setup      │"
echo "╰─────────────────────────────────────────────╯"
echo ""

# ── Optional frontend env ─────────────────────────────────────────────────
if [ ! -f "$REPO_ROOT/frontend/.env" ]; then
  echo "  · frontend/.env not found (using defaults; API proxied via Vite)"
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

  if [ ! -f "$VENV_DIR/bin/activate" ]; then
    echo "  │  Creating virtual environment..."
    "$PYTHON_CMD" -m venv "$VENV_DIR"
  fi
  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"
  pip install -q --upgrade pip 2>/dev/null || true
  pip install -q -r "$REPO_ROOT/backend/requirements.txt"
  echo "  │  ✓ Backend packages installed"

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

# ── Ports (do not disturb other projects unless --kill-ports) ─────────────
port_in_use() {
  lsof -ti :"$1" >/dev/null 2>&1
}

find_free_port() {
  local port=$1
  local max_tries=50
  local n=0
  while port_in_use "$port"; do
    n=$((n + 1))
    if [ "$n" -ge "$max_tries" ]; then
      echo "ERROR: No free port found near $1 (tried $max_tries ports)" >&2
      exit 1
    fi
    port=$((port + 1))
  done
  echo "$port"
}

maybe_kill_port() {
  local port=$1
  if [ "$KILL_PORTS" != true ]; then
    return 0
  fi
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Killing process(es) on port $port (PIDs: $pids) [--kill-ports]"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

echo "  Resolving ports (won't kill other apps unless --kill-ports)..."
maybe_kill_port "$BACKEND_PORT_PREF"
maybe_kill_port "$FRONTEND_PORT_PREF"

BACKEND_PORT=$(find_free_port "$BACKEND_PORT_PREF")
FRONTEND_PORT=$(find_free_port "$FRONTEND_PORT_PREF")

export PORT="$BACKEND_PORT"
export CORS_ORIGINS="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}"
export API_PROXY_TARGET="http://localhost:${BACKEND_PORT}"
export VITE_DEV_PORT="$FRONTEND_PORT"

cat > "$PORTS_FILE" <<EOF
# Auto-generated by deploy-local.sh — do not commit (add to .gitignore)
BACKEND_PORT=$BACKEND_PORT
FRONTEND_PORT=$FRONTEND_PORT
BACKEND_URL=http://localhost:${BACKEND_PORT}
FRONTEND_URL=http://localhost:${FRONTEND_PORT}
API_PROXY_TARGET=$API_PROXY_TARGET
EOF

if [ "$BACKEND_PORT" != "$BACKEND_PORT_PREF" ]; then
  echo "  · Backend:  $BACKEND_PORT (preferred $BACKEND_PORT_PREF was busy)"
else
  echo "  · Backend:  $BACKEND_PORT"
fi
if [ "$FRONTEND_PORT" != "$FRONTEND_PORT_PREF" ]; then
  echo "  · Frontend: $FRONTEND_PORT (preferred $FRONTEND_PORT_PREF was busy)"
else
  echo "  · Frontend: $FRONTEND_PORT"
fi
echo "  · Saved:    $PORTS_FILE"
echo ""

# ── Start servers ───────────────────────────────────────────────────────────
cleanup() {
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}

echo "  ┌─ Starting ──────────────────────────────────"
echo "  │  Open app:  http://localhost:${FRONTEND_PORT}"
echo "  │  API:       http://localhost:${BACKEND_PORT}  (via /api proxy)"
echo "  │  Press Ctrl+C to stop both servers."
echo "  └────────────────────────────────────────────"
echo ""

(cd "$REPO_ROOT/backend" && PORT="$BACKEND_PORT" python app.py) &
BACKEND_PID=$!

trap cleanup INT TERM

(
  cd "$REPO_ROOT/frontend"
  export API_PROXY_TARGET
  export VITE_DEV_PORT
  npm run dev -- --port "$FRONTEND_PORT" --strictPort
) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
