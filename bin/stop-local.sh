#!/usr/bin/env bash
# Stops Caddy and Supabase. Vite is killed via Ctrl+C in its own terminal.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

caddy stop >/dev/null 2>&1 || true
( cd "$REPO_ROOT" && supabase stop )
echo "Stopped Caddy and Supabase."
