# taxappeal-evidence: the Evidence step

Step 4 of the claims engine (Find → Qualify → Sign up → **Evidence** → File → Chase → Escalate → Collect), for the
**property-tax desk** in Florida (demo: Lee County). It takes one case, builds the packet a Value Adjustment Board
weighs (comparable sales and similar homes' assessments), sets the requested value and the evidence-exchange
deadline, writes what to ask the owner for, and hands the packet to File.

```
 case from board ──► pick comps ──────► sales value ──────► requested value ──► packet.pdf + .json ──► File board
                     arm's-length,      median $/sq ft      × county level,      + owner_request.txt
                     before Jan 1,      × subject sq ft     down to $1,000
                     closest size       + similar homes' assessments as support
```

| Core loop column | Engine (shared: `packet.py`, `render.py`, `cli.py`) | Desk adds (`florida.py`) |
|---|---|---|
| Checklist | `checklist` in packet.json: item, source (public / owner / sign_up), status | Florida's evidence list |
| Pull public records | comps and similar homes come in the case from Find, nothing downloaded twice | Lee appraiser site for permits and photos |
| Ask the claimant | `owner_request.txt` per case | private-company disclaimer, 5-day buffer |
| Deadline | `exchange_evidence_by`, `owner_items_by` | 15 days before the hearing |

## Quick start

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
taxevidence demo                                                   # fake case → data/demo/<case_id>/packet.pdf
taxevidence build cases.jsonl --out data/out --hearing 2026-10-20  # a file, a JSON list, JSONL or a folder
pytest -q                                                          # 8 tests, no network
```

Per case in `<out>/<case_id>/`: `packet.pdf` and `packet.html` (for the appraiser and the board), `packet.json`
(for File and Chase), `owner_request.txt` (for whoever talks to owners).

## Input

```json
{
  "case_id": "FL-Lee-2026-…", "county": "Lee", "roll_year": 2026,
  "county_level": 0.85,          // county's median just value ÷ sale price, from Find
  "annual_savings": 870,         // Find's estimate, passed through
  "petition_deadline": "2026-09-15",
  "subject": {"parcel_id": "…", "address": "…", "sqft": 1850, "year_built": 2004, "just_value": 410000,
              "last_sale": {"date": "2025-10-01", "price": 400000, "arms_length": true}},
  "sales": [{"parcel_id": "…", "address": "…", "sale_date": "2025-09-12", "sale_price": 412000,
             "adjusted_price": 418000, "sqft": 1800, "year_built": 2003, "arms_length": true}],
  "peers": [{"parcel_id": "…", "sqft": 1800, "just_value": 351000}]
}
```

`taxevidence/sample_case.json` is a full example (fake data).

## How the requested value is set

1. **Comparable sales.** Arm's-length sales before Jan 1 of the roll year, closest in size first (10% steps),
   then most recent; up to 5. Uses Find's time-adjusted price when present.
2. **Sales value.** Median price per sq ft × the subject's sq ft = market value, × the county's own level
   (median just value ÷ sale price) = the just value the county would give it if assessed like everyone else.
3. **Requested value** = that just value, rounded down to $1,000.
4. **Similar homes' assessments** (median just value per sq ft) go in the packet as support, never alone.

## Status

| Status | Means | Next |
|---|---|---|
| `ready` | ≥ 3 usable sales and they put the value below the county's | to File |
| `thin` | fewer than 3 usable sales | blocked; a person looks |
| `no_case` | sales, or the home's own recent sale, support the county's value | blocked; a person looks |

## Florida rules it applies

- **Evidence exchange:** our evidence must reach the property appraiser at least 15 calendar days before the
  hearing, counted back from the hearing day (s. 194.011(4)(a), F.S., as amended 2025-09-01; DOR PTO BUL 25-02).
  Late evidence can be excluded. `owner_items_by` is 5 days earlier.
- **What boards weigh:** comparable sales. Zillow/Redfin estimates are Find's false-positive filter, not evidence.
- **Authorization:** we're paid and unlicensed, so the owner must give us a power of attorney (DR-486POA),
  filed with the petition. DR-486A is only for unpaid helpers (Rules 12D-9.015, 12D-9.018, F.A.C.).
  That's Sign up's job; the checklist marks it `blocks_filing`.
- **Owner messages** say we're a private company not affiliated with any government agency.

## On Naïve

`naive/` holds the agent (`evidence.agent.yaml`), its instructions (`evidence.system.md`), its skill (`SKILL.md`)
and `setup.sh`, built like Find's. After `naive login`:

```bash
FILE_AGENT=agt_… ./naive/setup.sh     # Tarang's File agent id; prints the agent and deployment ids
naive deploy run <deployment id>      # run a pass now
```

Each hourly pass reads open cards on Evidence's board, builds packets, publishes each PDF, posts `ready` cases to
File's board (card key = case_id, so nothing posts twice) and marks `thin` / `no_case` cards blocked.

## Known limitations

- **Find's hand-off format isn't mapped yet.** The input above is Evidence's own; an adapter for Find's
  `candidates.jsonl` comes once we have taxappeal-find's `docs/HANDOFF.md`.
- **Only price per sq ft.** No separate adjustments for age, pool, lot or condition; Find's peer groups already
  match those roughly. Owner photos and repair quotes are the condition evidence.
- **Sizes are the county's effective area** (can include garages and porches): fine for like-for-like comparison,
  never quote it to an owner as living area.
- **County level** defaults to 1.0 (no reduction) when the case doesn't carry one.
- **Hearing date** comes from the card; the board sets it after filing, so the exchange deadline is empty until then.
- **Permits and county photos** are a manual `check` item.
- **Not run on Naïve yet:** the agent files copy Find's documented shapes; confirm at the event.
- **PDF needs Chrome or Chromium**; without it you get the HTML only.
