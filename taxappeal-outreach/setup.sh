#!/usr/bin/env bash
# One-time setup of the outreach agent on Naive. Run from anywhere after `naive login` (org: Claim OS).
#   ./setup.sh     # identity, vault with the AgentMail and Monid bearers (from .env), agent, paused schedule
# Keys are read from .env (git-ignored): AGENTMAIL_API_KEY, MONID_API_KEY. Never passed on argv, never printed.
# Re-running is safe: every resource is looked up first; a bearer already stored for a URL is kept.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] && { set -a; . ./.env; set +a; }
command -v naive >/dev/null || { echo "install the CLI: npm i -g @usenaive-sdk/cli"; exit 1; }
command -v jq >/dev/null || { echo "needs jq"; exit 1; }
echo "org: $(naive whoami | jq -r '.organization.name')"

echo "1/4 identity"
IDN=$(naive identity list --limit 50 | jq -r '.data[] | select(.name=="Claim OS Desk") | .id' | head -1)
[ -n "$IDN" ] || IDN=$(naive identity create --name "Claim OS Desk" \
  --description "Outreach persona: the Claim OS AgentMail inbox and Monid phone" | jq -r .id)
echo "  $IDN"

echo "2/4 vault: static bearers injected server-side, matched to each MCP server URL"
VLT=$(naive vault list --limit 50 | jq -r '.data[] | select(.display_name=="Claim OS Desk") | .id' | head -1)
[ -n "$VLT" ] || VLT=$(naive vault create --name "Claim OS Desk" --identity "$IDN" | jq -r .id)
bearer() {  # bearer <mcp url> <env var name>
  local url=$1 var=$2
  if [ -z "${!var:-}" ]; then echo "  $url: skipped, $var not set"; return; fi
  if naive vault credentials "$VLT" | jq -e --arg u "$url" '.data[] | select(.mcp_server_url==$u)' >/dev/null; then
    echo "  $url: already stored"; else
    printf '%s' "${!var}" | naive vault set --vault "$VLT" --mcp-bearer "$url" >/dev/null && echo "  $url: stored"; fi
}
bearer https://mcp.agentmail.to/mcp AGENTMAIL_API_KEY
bearer https://mcp.monid.ai/v1 MONID_API_KEY
echo "  $VLT"

echo "3/4 agent"
AGENT=$(naive agent list --limit 100 | jq -r '.data[] | select(.name=="outreach") | .id' | head -1)
if [ -n "$AGENT" ]; then naive agent update "$AGENT" -f outreach.agent.yaml >/dev/null; else
  AGENT=$(naive agent create -f outreach.agent.yaml | jq -r .id); fi
naive identity attach --agent "$AGENT" --identity "$IDN" >/dev/null
echo "  $AGENT"

echo "4/4 schedule: every 15 minutes, created paused"
DEP=$(naive deploy list | jq -r --arg a "$AGENT" '.data[] | select(.agent_id==$a and .cron=="*/15 * * * *") | .id' | head -1)
[ -n "$DEP" ] || DEP=$(naive deploy create --agent "$AGENT" --cron "*/15 * * * *" --budget-usd 0.30 \
  --window immediate --identity "$IDN" --prompt "Run your outreach pass now on the inbox claimos@agentmail.to." | jq -r .id) \
  && naive deploy pause "$DEP" >/dev/null   # a new schedule starts enabled; keep it paused until one good pass
echo "  $DEP ($(naive deploy show "$DEP" | jq -r .schedule_status))"

echo "done. After one good pass (naive session create --agent $AGENT --identity $IDN --message 'Run your outreach pass now on the inbox claimos@agentmail.to.' --budget-usd 0.30 --window immediate): naive deploy resume $DEP"
