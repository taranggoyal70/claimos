#!/usr/bin/env bash
# Set up the Evidence agent on Naive. Run from anywhere after `naive login` (org: Claim OS).
# Re-running is safe: the code zip is re-uploaded (the agent fetches the newest "taxappeal-evidence.zip")
# and the agent is created or updated by name. No schedule: assigning a company-board card starts it.
set -euo pipefail
cd "$(dirname "$0")"
command -v naive >/dev/null || { echo "install the CLI: npm i -g @usenaive-sdk/cli"; exit 1; }
command -v jq >/dev/null || { echo "needs jq"; exit 1; }
echo "org: $(naive whoami | jq -r '.organization.name')"

echo "1/2 code -> org file taxappeal-evidence.zip (code only: no data, venv or caches)"
ZIP=$(mktemp -d)/taxappeal-evidence.zip
(cd ../.. && zip -qr "$ZIP" taxappeal-evidence -x '*/data/*' '*/.venv/*' '*/__pycache__/*' '*.egg-info/*' '*/.pytest_cache/*')
FIL=$(naive file upload --file "$ZIP" --name taxappeal-evidence.zip --title "taxevidence code" | jq -r .id)
echo "  $FIL"

echo "2/2 agent"
AGENT=$(naive agent list --limit 100 | jq -r '.data[] | select(.name=="evidence") | .id' | head -1)
if [ -n "$AGENT" ]; then naive agent update "$AGENT" -f evidence.agent.yaml >/dev/null || [ $? -eq 2 ]; else
  AGENT=$(naive agent create -f evidence.agent.yaml | jq -r .id); fi
echo "  $AGENT"

echo "test: naive board assign agt_84kdvn48drb35vhrpnzd71ex21 <crd_…> evidence   (a 'FL Hendry 2026 · …' card on the company board)"
echo "watch: naive session list --agent $AGENT --limit 3"
