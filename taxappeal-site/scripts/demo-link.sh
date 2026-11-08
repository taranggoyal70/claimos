#!/bin/sh
# Prints a 14-day signed /portal link for the demo owner, signed with lib/token.ts. Nothing but the link is printed.
#   scripts/demo-link.sh [origin]       origin defaults to the live app; runs under bun, or node when bun is absent
# One-time setup. token.ts signs with TRACK_SECRET when the app has one (its DATABASE_SERVICE_KEY is write-only on the
# platform, so a laptop cannot derive that key). The same value goes in taxappeal-site/.env (git-ignored) and on the app:
#   printf 'TRACK_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
#   set -a; . ./.env; set +a
#   KEY=$(/usr/bin/python3 -I -c "import json;c=json.load(open('$HOME/.config/vetta/config.json'));print(c['profiles'][c['default_profile']]['api_key'])")
#   curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.vetta.sh/v1/apps/app_nkhc92xe21cyzfd5qakpkcj4g4/secrets \
#     -H "authorization: Bearer $KEY" -H 'content-type: application/json' -d "{\"name\":\"TRACK_SECRET\",\"value\":\"$TRACK_SECRET\"}"
#   then deploy the app (secrets apply on the next deployment).
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] && { set -a; . ./.env; set +a; }
[ -n "${TRACK_SECRET:-}" ] || { echo 'TRACK_SECRET is not set. Add it to taxappeal-site/.env and to the app secrets (see the header of this script), then deploy.' >&2; exit 1; }
ORIGIN=${1:-https://claimos-site-mds8vwd4myby.vercel.app}
CODE="import { sign } from './lib/token.ts'; console.log(process.argv.at(-1) + '/portal?t=' + sign('francesco.rosciano@me.com', 14 * 86400e3));"
if command -v bun >/dev/null 2>&1; then exec bun -e "$CODE" "$ORIGIN"; else exec node --input-type=module -e "$CODE" "$ORIGIN"; fi
