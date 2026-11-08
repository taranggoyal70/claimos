#!/usr/bin/env bash
# One-time setup of the Sign up agent on Naive. Run from anywhere after `naive login` (org: Claim OS).
#   ./setup.sh                      # identity, AgentMail Connect Link, agent, paused schedule
#   MONID_API_KEY=… ./setup.sh      # same, plus the Monid bearer into the vault (read from env, never argv)
# Re-running is safe: every resource is looked up by name first.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] && { set -a; . ./.env; set +a; }   # keys live in .env (git-ignored), not in argv
command -v naive >/dev/null || { echo "install the CLI: npm i -g @usenaive-sdk/cli"; exit 1; }
command -v jq >/dev/null || { echo "needs jq"; exit 1; }
echo "org: $(naive whoami | jq -r '.organization.name')"

echo "1/5 identity"
IDN=$(naive identity list --limit 50 | jq -r '.data[] | select(.name=="Claim OS Desk") | .id' | head -1)
[ -n "$IDN" ] || IDN=$(naive identity create --name "Claim OS Desk" \
  --description "Outreach persona: the Claim OS AgentMail inbox and Monid phone" | jq -r .id)
echo "  $IDN"

echo "2/5 AgentMail connection (the key is pasted on the hosted form, never here)"
AC=$(naive connections configs | jq -r '.data[] | select(.connector=="agent_mail") | .id' | head -1)
[ -n "$AC" ] || AC=$(naive connections config-add --connector agent_mail --auth api_key \
  --tool AGENT_MAIL_LIST_MESSAGES --tool AGENT_MAIL_GET_MESSAGE --tool AGENT_MAIL_SEND_EMAIL | jq -r .id)
CA=$(naive connections list --identity "$IDN" | jq -r '.data[] | select(.status=="active" or .status=="initiated") | "\(.id) \(.status) \(.connect_link // "")"' | head -1)
if [ -n "$CA" ]; then echo "  connection $CA"; else
  naive identity connect --identity "$IDN" --auth-config "$AC" \
    | jq -r '"  connection \(.id): open this link and paste the AgentMail key (am_…):\n  \(.connect_link)"'
fi

echo "3/5 Monid bearer -> vault (injected server-side for mcp.monid.ai)"
if [ -n "${MONID_API_KEY:-}" ]; then
  VLT=$(naive vault list --limit 50 | jq -r '.data[] | select(.name=="Claim OS Desk") | .id' | head -1)
  [ -n "$VLT" ] || VLT=$(naive vault create --name "Claim OS Desk" --identity "$IDN" | jq -r .id)
  printf '%s' "$MONID_API_KEY" | naive vault set --vault "$VLT" --mcp-bearer https://mcp.monid.ai/v1 >/dev/null
  echo "  stored in $VLT"
else echo "  skipped: MONID_API_KEY not set (phone tools will report mcp_server_unavailable until it is)"; fi

echo "4/5 agent"
AGENT=$(naive agent list --limit 100 | jq -r '.data[] | select(.name=="signup") | .id' | head -1)
if [ -n "$AGENT" ]; then naive agent update "$AGENT" -f signup.agent.yaml >/dev/null; else
  AGENT=$(naive agent create -f signup.agent.yaml | jq -r .id); fi
naive identity attach --agent "$AGENT" --identity "$IDN" >/dev/null
echo "  $AGENT"

echo "5/5 schedule: every 15 minutes, created paused"
DEP=$(naive deploy list | jq -r --arg a "$AGENT" '.data[] | select(.agent_id==$a and .cron=="*/15 * * * *") | .id' | head -1)
[ -n "$DEP" ] || DEP=$(naive deploy create --agent "$AGENT" --cron "*/15 * * * *" --budget-usd 0.30 \
  --window immediate --identity "$IDN" --prompt "Run your Sign up pass now." | jq -r .id)
naive deploy pause "$DEP" >/dev/null && echo "  $DEP (paused)"

echo "done. When 'naive connections show --connection <id>' says active: naive deploy resume $DEP"
