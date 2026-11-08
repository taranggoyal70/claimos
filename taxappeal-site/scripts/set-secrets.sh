#!/bin/sh
# One-time, by a person (agents are denied secret-store writes on this laptop): puts TRACK_SECRET and NAIVE_API_KEY
# on app claimos-site, then you deploy, because secrets apply on the next deployment:
#   sh scripts/set-secrets.sh && naive app deploy app_nkhc92xe21cyzfd5qakpkcj4g4 .
# TRACK_SECRET comes from .env (git-ignored; generated here when missing) so scripts/demo-link.sh signs the same links.
# NAIVE_API_KEY is a NEW key scoped files:read only (POST /v1/files/{id}/url needs it), never the org key. Running this
# twice creates a second key: revoke the old one with `naive keys revoke <key id>`. Prints HTTP codes and the key id, never a value.
set -eu
APP=app_nkhc92xe21cyzfd5qakpkcj4g4
cd "$(dirname "$0")/.."
grep -q '^TRACK_SECRET=' .env 2>/dev/null || printf 'TRACK_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
set -a; . ./.env; set +a
# The org key stays in the CLI's config; it is read here and sent only to the API.
KEY=$(/usr/bin/python3 -I -c "import json;c=json.load(open('$HOME/.config/vetta/config.json'));print(c['profiles'][c['default_profile']]['api_key'])")

put() { # put NAME VALUE -> "NAME <http code>"; a non-2xx prints the API's error fields only and stops
  BODY=$(/usr/bin/python3 -I -c 'import json,sys;print(json.dumps({"name":sys.argv[1],"value":sys.argv[2]}))' "$1" "$2")
  OUT=$(curl -sS -w '\n%{http_code}' -X POST "https://api.vetta.sh/v1/apps/$APP/secrets" -H "authorization: Bearer $KEY" -H 'content-type: application/json' -d "$BODY")
  CODE=$(printf '%s' "$OUT" | tail -n1); echo "$1 $CODE"
  case "$CODE" in 2*) ;; *) printf '%s' "$OUT" | sed '$d' | /usr/bin/python3 -I -c 'import json,sys
try: d=json.load(sys.stdin); print({k:d[k] for k in ("error","message","code","param") if k in d})
except Exception: print("(non-json error body)")'; exit 1;; esac
}

put TRACK_SECRET "$TRACK_SECRET"

CREATED=$(naive keys create --name claimos-site-files --scopes files:read)
echo "created key $(printf '%s' "$CREATED" | /usr/bin/python3 -I -c 'import json,sys;print(json.load(sys.stdin).get("id",""))')"
FILES_KEY=$(printf '%s' "$CREATED" | /usr/bin/python3 -I -c 'import json,sys;print(json.load(sys.stdin).get("secret",""))')
[ -n "$FILES_KEY" ] || { echo "no 'secret' field in the create response (fields: $(printf '%s' "$CREATED" | /usr/bin/python3 -I -c 'import json,sys;print(sorted(json.load(sys.stdin)))')); revoke the key above" >&2; exit 1; }
put NAIVE_API_KEY "$FILES_KEY"

echo "app secret names now: $(naive app secrets "$APP" | /usr/bin/python3 -I -c 'import json,sys;d=json.load(sys.stdin);print(sorted(r["name"] for r in (d if isinstance(d,list) else d.get("data",d))))')"
echo "Now deploy: naive app deploy $APP $(pwd)"
