---
name: taxevidence
description: How to run and read the taxevidence Evidence program (hearing packets for property-tax appeals).
---

# taxevidence: Evidence step

## Commands
- `taxevidence build <file or folder> --out <dir> [--hearing YYYY-MM-DD] [--no-pdf]`: one packet per case.
  Input is a case JSON, a JSON list, JSONL, or a folder of them.
- `taxevidence demo`: the packet for a bundled fake case.

## Output per case (`<out>/<case_id>/`)
- `packet.pdf` / `packet.html`: what goes to the property appraiser and the board.
- `packet.json`: everything File needs: requested value, deadlines, checklist, rules.
- `owner_request.txt`: the message asking the owner for photos, repair quotes and similar items.

## Status
- **ready**: at least 3 comparable sales and they put the value below the county's. Send to File.
- **thin**: fewer than 3 usable sales. Similar homes' assessments alone are support, not a case.
- **no_case**: the sales or the home's own sale support the county's value.

## Deadlines in packet.json
- `exchange_evidence_by` = hearing − 15 calendar days (s. 194.011(4)(a), F.S., since 2025-09-01). Late evidence can be excluded.
- `owner_items_by` = 5 days before that.
