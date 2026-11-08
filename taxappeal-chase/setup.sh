#!/usr/bin/env bash
# Setup of the chase agent on Naive. Run from anywhere after `naive login` (org: Claim OS).
# Needs the "Claim OS Desk" persona and its vault (AgentMail bearer): ../taxappeal-outreach/setup.sh makes them.
# Re-running is safe: the agent is updated in place, an existing schedule is left as it is.
set -euo pipefail
cd "$(dirname "$0")"
command -v naive >/dev/null || { echo "install the CLI: npm i -g @usenaive-sdk/cli"; exit 1; }
command -v jq >/dev/null || { echo "needs jq"; exit 1; }
echo "org: $(naive whoami | jq -r '.organization.name')"

echo "1/3 persona"
IDN=$(naive identity list --limit 50 | jq -r '.data[] | select(.name=="Claim OS Desk") | .id' | head -1)
[ -n "$IDN" ] || { echo "no 'Claim OS Desk' persona: run ../taxappeal-outreach/setup.sh first"; exit 1; }
echo "  $IDN"

echo "2/3 agent chase"
AGENT=$(naive agent list --limit 100 | jq -r '.data[] | select(.name=="chase") | .id' | head -1)
if [ -n "$AGENT" ]; then naive agent update "$AGENT" -f chase.agent.yaml >/dev/null; else
  AGENT=$(naive agent create -f chase.agent.yaml | jq -r .id); fi
naive identity attach --agent "$AGENT" --identity "$IDN" >/dev/null
echo "  $AGENT"

echo "3/3 schedule: daily 09:30 America/New_York, created paused"
CRON="30 9 * * *"
DEP=$(naive deploy list | jq -r --arg a "$AGENT" --arg c "$CRON" '.data[] | select(.agent_id==$a and .cron==$c) | .id' | head -1)
if [ -z "$DEP" ]; then
  DEP=$(naive deploy create --agent "$AGENT" --cron "$CRON" --timezone America/New_York --budget-usd 1.00 \
    --window immediate --identity "$IDN" --prompt "Run your chase pass now." | jq -r .id)
  naive deploy pause "$DEP" >/dev/null   # a new schedule starts enabled; keep it paused until one good pass
fi
echo "  $DEP ($(naive deploy show "$DEP" | jq -r .schedule_status))"

echo "done. One pass by hand: naive session create --agent $AGENT --identity $IDN --message 'Run your chase pass now.' --budget-usd 1.00 --window immediate"
echo "then: naive deploy resume $DEP"
