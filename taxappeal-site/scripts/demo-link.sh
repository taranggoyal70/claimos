#!/bin/sh
# Prints a 14-day signed /portal link for the demo owner, signed with lib/token.ts, once the live app has accepted it.
#   scripts/demo-link.sh [origin]       origin defaults to the live app; runs under bun, or node when bun is absent
# Without this script the demo path still works: open /track, enter francesco.rosciano@me.com, and the emailed
# 24-hour link opens the same /portal.
#
# One-time setup, by a person: `sh scripts/set-secrets.sh`, then deploy (secrets apply on the next deployment). It puts
# TRACK_SECRET from taxappeal-site/.env (git-ignored) on the app, so token.ts signs with the same key here and there
# (the app's DATABASE_SERVICE_KEY is write-only on the platform, so a laptop cannot derive that one).
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] && { set -a; . ./.env; set +a; }
[ -n "${TRACK_SECRET:-}" ] || { echo 'TRACK_SECRET is not set. Add it to taxappeal-site/.env and to the app secrets (see the header of this script), then deploy.' >&2; exit 1; }
ORIGIN=${1:-https://claimos-site-mds8vwd4myby.vercel.app}
CODE="import { sign } from './lib/token.ts'; console.log(sign('francesco.rosciano@me.com', 14 * 86400e3));"
if command -v bun >/dev/null 2>&1; then TOKEN=$(bun -e "$CODE"); else TOKEN=$(node --input-type=module -e "$CODE"); fi
# The app accepts only tokens signed with its own TRACK_SECRET; a link it rejects would show "That link has expired" on demo day.
OUT=$(curl -sS "$ORIGIN/api/portal?t=$TOKEN")
case "$OUT" in *'"email"'*) ;; *) echo "$ORIGIN rejected the token ($OUT): TRACK_SECRET is not on the app yet, or the app has not been deployed since it was set. See the header of this script." >&2; exit 1 ;; esac
echo "$ORIGIN/portal?t=$TOKEN"
