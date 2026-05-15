#!/usr/bin/env bash
# Idempotent local dev bootstrap.
# Brings up Supabase, Caddy (TLS reverse proxy on :443), and the Vite dev server.
# First run prompts for sudo twice: once to add the hosts entry, once for caddy trust.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOSTNAME="tylerbatchelor.local"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

step "Checking prerequisites"
for cmd in supabase caddy npm docker; do
	if ! command -v "$cmd" >/dev/null 2>&1; then
		echo "Missing $cmd. Install with: brew install $cmd (or follow README)" >&2
		exit 1
	fi
done

if ! grep -q "$HOSTNAME" /etc/hosts; then
	step "Adding $HOSTNAME to /etc/hosts (sudo)"
	echo "127.0.0.1 $HOSTNAME" | sudo tee -a /etc/hosts >/dev/null
fi

if ! security find-certificate -c "Caddy Local Authority" /Library/Keychains/System.keychain >/dev/null 2>&1; then
	step "Trusting Caddy local CA in System keychain (sudo)"
	sudo caddy trust
fi

step "Starting Supabase"
( cd "$REPO_ROOT" && supabase start )

step "Starting Caddy on :4443"
caddy stop >/dev/null 2>&1 || true
caddy start --config "$REPO_ROOT/Caddyfile" --pidfile "$REPO_ROOT/.caddy.pid"

step "Starting Vite dev server (Ctrl+C to stop)"
echo "App: https://$HOSTNAME:4443"
echo "Studio: http://127.0.0.1:54323"
echo
cd "$REPO_ROOT/app" && npm run dev
