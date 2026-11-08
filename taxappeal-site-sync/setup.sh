#!/usr/bin/env bash
# Set up the Site sync agent on Naive. Run from anywhere after `naive login` (org: Claim OS).
# Re-running is safe: the agent and schedule are looked up first; sync.py is re-uploaded and the
# schedule's prompt points at the new file id.
set -euo pipefail
cd "$(dirname "$0")"
command -v naive >/dev/null || { echo "install the CLI: npm i -g @usenaive-sdk/cli"; exit 1; }
command -v jq >/dev/null || { echo "needs jq"; exit 1; }
CRON="40 */6 * * *"
echo "org: $(naive whoami | jq -r '.organization.name')"

echo "1/3 agent"
AGENT=$(naive agent list --limit 100 | jq -r '.data[] | select(.name=="site-sync") | .id' | head -1)
if [ -n "$AGENT" ]; then naive agent update "$AGENT" -f site-sync.agent.yaml >/dev/null || [ $? -eq 2 ]; else
  AGENT=$(naive agent create -f site-sync.agent.yaml | jq -r .id); fi
echo "  $AGENT"

echo "2/3 sync.py -> org file"
FIL=$(naive file upload --file sync.py --name sync.py --title "site-sync sync.py" | jq -r .id)
echo "  $FIL"
PROMPT="Run your site-sync pass now. sync.py is org file $FIL."

echo "3/3 schedule: $CRON America/New_York, created paused"
DEP=$(naive deploy list --limit 100 | jq -r --arg a "$AGENT" '.data[] | select(.agent_id==$a) | .id' | head -1)
if [ -n "$DEP" ]; then naive deploy update "$DEP" --prompt "$PROMPT" >/dev/null || [ $? -eq 2 ]; else
  DEP=$(naive deploy create --agent "$AGENT" --cron "$CRON" --timezone America/New_York --budget-usd 0.50 \
    --window immediate --prompt "$PROMPT" | jq -r .id)
  naive deploy pause "$DEP" >/dev/null; fi
echo "  $DEP: $(naive deploy show "$DEP" | jq -c '{schedule_status, cron, timezone}')"

echo "one pass by hand: naive session create --agent $AGENT --message \"$PROMPT\" --budget-usd 0.50 --window immediate"
echo "start the schedule: naive deploy resume $DEP"
