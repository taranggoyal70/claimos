#!/usr/bin/env bash
# One-time setup of the Evidence agent on Naive. Run from the repo root after `naive login`.
#   FILE_AGENT=agt_... ./naive/setup.sh
# Optional: TAXEVIDENCE_GIT=https://github.com/<team>/taxappeal-evidence (else the code is uploaded as a zip)
# Mirrors Find's naive/setup.sh; not yet run against a live org.
set -euo pipefail
command -v naive >/dev/null || { echo "install the CLI: npm i -g @usenaive-sdk/cli"; exit 1; }
command -v jq >/dev/null || { echo "needs jq (Mac: brew install jq)"; exit 1; }
: "${FILE_AGENT:?set FILE_AGENT to the File agent id (agt_...) - Evidence posts packets to its board}"

naive whoami >/dev/null
naive plan show >/dev/null || { echo "your org needs a plan: naive plan show / naive plan set"; exit 1; }

echo "1/4 skill"
naive skill push --slug taxevidence --file naive/SKILL.md --description "Run and read the taxevidence Evidence program" >/dev/null

echo "2/4 code"
if [ -z "${TAXEVIDENCE_GIT:-}" ]; then
  rm -f /tmp/taxappeal-evidence.zip
  # code only: no data, no run outputs, no secrets
  (cd .. && zip -qr /tmp/taxappeal-evidence.zip "$(basename "$OLDPWD")" -x '*/data/*' '*/.git/*' \
    '*/__pycache__/*' '*.egg-info/*' '*/.env' '*/.venv/*' '*/.pytest_cache/*')
  naive file upload --file /tmp/taxappeal-evidence.zip --name taxappeal-evidence.zip --title "taxevidence code" >/dev/null
fi

echo "3/4 agent"
AGENT_ID=$(naive agent apply -f naive/ | jq -r '.. | objects | select(.object? == "agent") | .id' | head -1)
echo "  evidence agent: $AGENT_ID"

echo "4/4 schedule: hourly at :47, America/New_York"
PROMPT="Run your Evidence pass now. Environment: EVIDENCE_DATA_DIR=\$HOME/evidence-data FILE_BOARD=$FILE_AGENT ${TAXEVIDENCE_GIT:+TAXEVIDENCE_GIT=$TAXEVIDENCE_GIT}"
naive deploy create --agent "$AGENT_ID" --cron "47 * * * *" --timezone America/New_York \
  --prompt "$PROMPT" --budget-usd 2 --window loose | jq '{id, cron, next_run_at}'

echo "done. Trigger a pass now with: naive deploy run <deployment id>"
