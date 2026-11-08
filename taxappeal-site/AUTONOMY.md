# Claim OS autonomy: the site's MCP server and letters by mail

## Architecture

1. Nothing runs on a laptop. Naïve agents run on Naïve schedules or inbound-mail wakes and call this app.
2. The app serves MCP server `claimos` at `https://claimos-site-mds8vwd4myby.vercel.app/api/mcp` (`api/mcp.ts` + `lib/mcp.ts`).
3. Transport: stateless Streamable HTTP, JSON only: `initialize`, `ping`, `tools/list`, `tools/call`; notifications get 202.
4. Auth: `Authorization: Bearer` must equal app secret `CLAIMOS_MCP_BEARER` (constant-time); anything else is 401.
5. Agents get that bearer from vault `vlt_dnpg5ne60hdefpq65t9hbrvjrn`, injected server-side for the MCP URL.
6. Tools: `health`, `letters_due`, `send_letter`, `letter_preview`, `mirror_run`. One call per session does a whole pass,
   because Naïve holds every further MCP call of a session for approval.
7. `mirror_run {}` runs `lib/mirror.ts` (board mirror + bridges); `{dry: true}` only plans; `only` limits the steps.
8. `send_letter {all_due: true}` = `letters_due` and then up to 10 letters per call, inside a 40 s guard. `{case_id}` sends one.
9. Letters due: board note starts `QUALIFIED`, Find owner type individual or trust with a mailing address, `claim_codes.mailed_at` null.
10. Owner data comes from the newest `candidates.jsonl` in the org files that holds the case (streamed, stops early).
11. Template: `lib/letter.html`, read at render time. It is the only copy: `taxappeal-site-sync/letter.html` is a symlink to it.
12. Renders match letters.py byte for byte. 91 of 91 letters written 2026-11-08 were identical.
13. Lob: no `LOB_API_KEY` = dry (render + `letter-rendered · code · preview link` comment). `test_` key = Lob renders a PDF
    and mails nothing. A `live_` key is refused unless `LOB_LIVE=yes`.
14. A sent letter sets `claim_codes.mailed_at` and comments `letter-sent · code · ltr_id · delivery date` on the Find card.
    A failure comments `letter-failed`. The next pass retries once, then writes `letter-gave-up` and skips the case for good.
15. `GET /api/letter?code=…&s=…` shows a rendered letter. `s` is an HMAC of the code with `TRACK_SECRET`.

## One-time commands (a person runs these; agents are denied key and secret writes)

Run from the repo. Values come from stdin or the CLI's own config and are never printed.

```bash
cd ~/Desktop/codes/claimos/taxappeal-site
APP=app_nkhc92xe21cyzfd5qakpkcj4g4
VAULT=vlt_dnpg5ne60hdefpq65t9hbrvjrn
MCP=https://claimos-site-mds8vwd4myby.vercel.app/api/mcp
ORG=$(/usr/bin/python3 -I -c "import json,os;c=json.load(open(os.path.expanduser('~/.config/vetta/config.json')));print(c['profiles'][c['default_profile']]['api_key'])")
# put NAME: sets app secret NAME to stdin (an existing name is overwritten); prints NAME and the HTTP code only.
# An empty stdin sends nothing valid (the API answers 400), so a failed step never blanks a secret.
put() { /usr/bin/python3 -I -c 'import json,sys;v=sys.stdin.read().strip();v or sys.exit(sys.argv[1]+": empty value, not set");print(json.dumps({"name":sys.argv[1],"value":v}))' "$1" \
  | curl -sS -o /dev/null -w "$1 %{http_code}\n" -X POST "https://api.vetta.sh/v1/apps/$APP/secrets" \
      -H "authorization: Bearer $ORG" -H 'content-type: application/json' -d @-; }

# 1. App key that can read and write the board and read Find's files (replaces the files:read-only key)
naive keys create --name claimos-site --scopes agents:read,agents:write,files:read \
  | /usr/bin/python3 -I -c 'import json,sys;d=json.load(sys.stdin);print("key id",d["id"],file=sys.stderr);print(d["secret"])' \
  | put NAIVE_API_KEY

# 2. MCP bearer: same random value on the app and in the agents' vault for the MCP URL
T=$(openssl rand -hex 32)
printf '%s' "$T" | put CLAIMOS_MCP_BEARER
printf '%s' "$T" | naive vault set --vault "$VAULT" --mcp-bearer "$MCP"

# 3. Lob TEST secret key (starts with test_) from dashboard.lob.com > Settings > API Keys. Paste it, then press Enter.
read -rs LOB && printf '%s' "$LOB" | put LOB_API_KEY; unset LOB

# 4. Deploy (secrets apply on the next deployment), then wait for the build
naive app deploy "$APP" .
naive app deployments "$APP" --limit 1

# 5. Check: expect 401 with a wrong bearer, then ok:true and lob:"test" from health
curl -sS -o /dev/null -w 'wrong bearer: %{http_code}\n' -X POST "$MCP" -H 'authorization: Bearer wrong' -d '{}'
curl -sS -X POST "$MCP" -H "authorization: Bearer $T" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"health","arguments":{}}}'; echo
unset T ORG

# 6. After step 5 passes: revoke the old files:read-only app key (claimos-site-files)
naive keys revoke key_94v9rm2nkwjebzzaaehmc59txy
```

## Before any live_ Lob key

- The sender address in `lib/letters.ts` (`FROM`) is a placeholder: Lob's own docs address, 210 King St, San Francisco.
  Replace it with Claim OS's real US business address.
- Test-key sends set `claim_codes.mailed_at` even though nothing was mailed. Clear those rows before going live, or the
  cases never get a real letter.
- Then set app secrets `LOB_API_KEY` (live_) and `LOB_LIVE=yes`, and deploy. Each live letter costs about $0.90.
