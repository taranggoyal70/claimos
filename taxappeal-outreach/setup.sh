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

echo "3/4 agents: signup (hello@ wakes it, daily sweep) and outreach (card-driven, outreach@ wakes it)"
apply() {  # apply <name> -> prints the agent id; creates or updates from <name>.agent.yaml, attaches the persona
  local id; id=$(naive agent list --limit 100 | jq -r --arg n "$1" '.data[] | select(.name==$n) | .id' | head -1)
  if [ -n "$id" ]; then naive agent update "$id" -f "$1.agent.yaml" >/dev/null; else
    id=$(naive agent create -f "$1.agent.yaml" | jq -r .id); fi
  naive identity attach --agent "$id" --identity "$IDN" >/dev/null; echo "$id"
}
AGENT=$(apply signup); echo "  signup   $AGENT"
OUTREACH=$(apply outreach); echo "  outreach $OUTREACH (started by assigning it a card)"

echo "4/4 native inboxes (wake on: a mail starts the owning agent) and the signup daily sweep"
inbox() {  # inbox <localpart> <agent id>: provisions <localpart>@ on the org's system domain once
  local addr="$1@claim-os-d4myby.usenaive.ai"
  naive identity email list --identity "$IDN" | jq -e --arg a "$addr" '.data[] | select(.address==$a)' >/dev/null \
    || naive identity email provision --identity "$IDN" --address "$addr" --agent "$2" >/dev/null
  echo "  $addr -> $2"
}
inbox hello "$AGENT"; inbox outreach "$OUTREACH"
SWEEP="Run your Sign up sweep now."
DEP=$(naive deploy list | jq -r --arg a "$AGENT" '.data[] | select(.agent_id==$a) | .id' | head -1)
if [ -n "$DEP" ]; then naive deploy update "$DEP" --cron "0 9 * * *" --timezone America/New_York --budget-usd 1.00 \
    --identity "$IDN" --prompt "$SWEEP" >/dev/null || [ $? -eq 2 ]; else
  DEP=$(naive deploy create --agent "$AGENT" --cron "0 9 * * *" --timezone America/New_York --budget-usd 1.00 \
    --window immediate --identity "$IDN" --prompt "$SWEEP" | jq -r .id); fi
echo "  $DEP ($(naive deploy show "$DEP" | jq -c '{schedule_status, cron}'))"
echo "done. Owner mail to hello@claim-os-d4myby.usenaive.ai starts signup on its own; county replies to outreach@ start outreach."
