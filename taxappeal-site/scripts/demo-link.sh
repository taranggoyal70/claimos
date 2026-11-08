#!/bin/sh
# Prints a 14-day signed /portal link for the demo owner, signed with lib/token.ts, once the live app has accepted it.
#   scripts/demo-link.sh [origin]       origin defaults to the live app; runs under bun, or node when bun is absent
# Without this script the demo path still works: open /track, enter francesco.rosciano@me.com, and the emailed
# 24-hour link opens the same /portal.
#
# One-time setup, by a person (the app's secret store is written through the org API key, which stays out of agents).
# token.ts signs with TRACK_SECRET when the app has one (its DATABASE_SERVICE_KEY is write-only on the platform, so a
# laptop cannot derive that key). The same value goes in taxappeal-site/.env (git-ignored) and on the app:
#   grep -q '^TRACK_SECRET=' .env 2>/dev/null || printf 'TRACK_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
#   set -a; . ./.env; set +a
#   KEY=$(/usr/bin/python3 -I -c "import json;c=json.load(open('$HOME/.config/vetta/config.json'));print(c['profiles'][c['default_profile']]['api_key'])")
#   curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.vetta.sh/v1/apps/app_nkhc92xe21cyzfd5qakpkcj4g4/secrets \
#     -H "authorization: Bearer $KEY" -H 'content-type: application/json' -d "{\"name\":\"TRACK_SECRET\",\"value\":\"$TRACK_SECRET\"}"
# Optional, for the document download links in the portal: a key that can only read files (POST /v1/files/{id}/url
# needs files:read), never the org key.
#   FILES_KEY=$(naive keys create --name claimos-site-files --scopes files:read | /usr/bin/python3 -I -c 'import json,sys;print(json.load(sys.stdin)["secret"])')
#   curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.vetta.sh/v1/apps/app_nkhc92xe21cyzfd5qakpkcj4g4/secrets \
#     -H "authorization: Bearer $KEY" -H 'content-type: application/json' -d "{\"name\":\"NAIVE_API_KEY\",\"value\":\"$FILES_KEY\"}"
# Then deploy the app: secrets apply on the next deployment.
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] && { set -a; . ./.env; set +a; }
[ -n "${TRACK_SECRET:-}" ] || { echo 'TRACK_SECRET is not set. Add it to taxappeal-site/.env and to the app secrets (see the header of this script), then deploy.' >&2; exit 1; }
ORIGIN=${1:-https://claimos-site-mds8vwd4myby.vercel.app}
CODE="import { sign } from './lib/token.ts'; console.log(sign('francesco.rosciano@me.com', 14 * 86400e3));"
if command -v bun >/dev/null 2>&1; then TOKEN=$(bun -e "$CODE"); else TOKEN=$(node --input-type=module -e "$CODE"); fi
# The app accepts only tokens signed with its own TRACK_SECRET; a link it rejects would show "That link has expired" on demo day.
STATUS=$(curl -sS -o /dev/null -w '%{http_code}' "$ORIGIN/api/portal?t=$TOKEN")
[ "$STATUS" = 200 ] || { echo "$ORIGIN rejected the token (HTTP $STATUS): TRACK_SECRET is not on the app yet, or the app has not been deployed since it was set. See the header of this script." >&2; exit 1; }
echo "$ORIGIN/portal?t=$TOKEN"
