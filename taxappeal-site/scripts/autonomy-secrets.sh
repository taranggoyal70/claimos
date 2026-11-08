#!/bin/bash
# One-time secrets for the autonomous loop (a person runs it; agents are denied secret writes). Prints names and HTTP codes only.
#   1. NAIVE_API_KEY: a new key that can read and write the board and read Find's files (replaces the files:read-only key)
#   2. CLAIMOS_MCP_BEARER: one random value on the app and in the agents' vault for the MCP URL
#   3. Optional, read from the git-ignored taxappeal-site/.env when present: LOB_API_KEY (test_…), BOOKING_URL, PRESENTER_EMAIL
# Usage: sh taxappeal-site/scripts/autonomy-secrets.sh   then deploy; secrets apply on the next deployment.
set -uo pipefail
cd "$(dirname "$0")/.."
APP=app_nkhc92xe21cyzfd5qakpkcj4g4
VAULT=vlt_dnpg5ne60hdefpq65t9hbrvjrn
MCP=https://claimos-site-mds8vwd4myby.vercel.app/api/mcp
ORG=$(/usr/bin/python3 -I -c "import json,os;c=json.load(open(os.path.expanduser('~/.config/vetta/config.json')));print(c['profiles'][c['default_profile']]['api_key'])")
# put NAME: app secret NAME = stdin. An empty value is refused, so a failed step never blanks a secret.
put() { /usr/bin/python3 -I -c 'import json,sys;v=sys.stdin.read().strip();v or sys.exit(sys.argv[1]+": empty value, not set");print(json.dumps({"name":sys.argv[1],"value":v}))' "$1" \
  | curl -sS -o /dev/null -w "$1 %{http_code}\n" -X POST "https://api.vetta.sh/v1/apps/$APP/secrets" \
      -H "authorization: Bearer $ORG" -H 'content-type: application/json' -d @-; }

naive keys create --name claimos-site --scopes agents:read,agents:write,files:read \
  | /usr/bin/python3 -I -c 'import json,sys;d=json.load(sys.stdin);print("new key id",d["id"],file=sys.stderr);print(d.get("secret") or d.get("key") or d.get("token") or "")' \
  | put NAIVE_API_KEY

T=$(openssl rand -hex 32)
printf '%s' "$T" | put CLAIMOS_MCP_BEARER
printf '%s' "$T" | naive vault set --vault "$VAULT" --mcp-bearer "$MCP" >/dev/null && echo "vault bearer for $MCP: stored"
unset T

for N in LOB_API_KEY BOOKING_URL PRESENTER_EMAIL; do
  V=$(grep -E "^$N=" .env 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//')
  if [ -n "$V" ]; then printf '%s' "$V" | put "$N"; else echo "$N: not in taxappeal-site/.env, skipped"; fi
done
unset V ORG
