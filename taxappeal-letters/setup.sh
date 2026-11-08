#!/usr/bin/env bash
# Set up the Letters agent on Naive. Run from anywhere after `naive login` (org: Claim OS).
# Needs the "Claim OS Desk" persona, whose vault holds the bearer for the claimos MCP URL (a person stores it:
#   naive vault set --vault <Claim OS Desk vault> --mcp-bearer https://claimos-site-mds8vwd4myby.vercel.app/api/mcp
#   with the app secret CLAIMOS_MCP_BEARER on stdin).
# Re-running is safe: the agent is updated in place, an existing schedule is left as it is.
set -euo pipefail
cd "$(dirname "$0")"
command -v naive >/dev/null || { echo "install the CLI: npm i -g @usenaive-sdk/cli"; exit 1; }
command -v jq >/dev/null || { echo "needs jq"; exit 1; }
CRON="0 10 * * *"
PROMPT="Run your letters pass now."
IDN=$(naive identity list --limit 50 | jq -r '.data[] | select(.name=="Claim OS Desk") | .id' | head -1)
[ -n "$IDN" ] || { echo "no 'Claim OS Desk' persona: run ../taxappeal-outreach/setup.sh first"; exit 1; }

AGENT=$(naive agent list --limit 100 | jq -r '.data[] | select(.name=="letters") | .id' | head -1)
if [ -n "$AGENT" ]; then naive agent update "$AGENT" -f letters.agent.yaml >/dev/null || [ $? -eq 2 ]; else
  AGENT=$(naive agent create -f letters.agent.yaml | jq -r .id); fi
naive identity attach --agent "$AGENT" --identity "$IDN" >/dev/null
echo "agent $AGENT"

DEP=$(naive deploy list --limit 100 | jq -r --arg a "$AGENT" '.data[] | select(.agent_id==$a) | .id' | head -1)
[ -n "$DEP" ] || DEP=$(naive deploy create --agent "$AGENT" --cron "$CRON" --timezone America/New_York --budget-usd 1.00 \
  --window immediate --identity "$IDN" --prompt "$PROMPT" | jq -r .id)
echo "schedule $DEP: $(naive deploy show "$DEP" | jq -c '{schedule_status, cron, timezone}')"
echo "one pass by hand: naive session create --agent $AGENT --identity $IDN --message \"$PROMPT\" --budget-usd 1.00 --window immediate"
