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
taxevidence adapt candidates.jsonl --case-id FL-36-2026-…          # one Find hand-off line -> a case for build
pytest -q                                                          # 11 tests, no network
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

`taxevidence/sample_case.json` is a full example (fake data). `taxevidence adapt` builds this from a line of Find's
`candidates.jsonl` (`taxevidence/find_adapter.py`: `evidence.sales` → `sales` with `sale_month` as the 1st of the
month, `evidence.neighbors` → `peers`, `signals.county_level`, `estimate.annual_savings`, `filing_window.closes`,
`signals.own_sale` → `subject.last_sale`; Find's comps are already arm's-length sales before Jan 1).

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

`naive/` holds the agent (`evidence.agent.yaml`), its instructions (`evidence.system.md`) and `setup.sh`, built like
site-sync's. It has no schedule: assigning a company-board card (Find's "FL Hendry 2026 · …" cards, owner `CEO`
`agt_84kdvn48drb35vhrpnzd71ex21`) to `evidence` starts a session on it. Find's cards carry the case JSON without the
`evidence` block, so the agent fetches both code zips from the org file library, runs
`taxfind run --counties <county> --no-avm --include-closed --handoff file` in its sandbox, takes the case's line from
that run's `candidates.jsonl` with `taxevidence adapt`, builds the packet, publishes `packet.json` + `packet.pdf`
(`packet.html` when the sandbox has no browser), writes the result on the card (`done`, or `blocked` for `thin` /
`no_case`) and creates the hand-off card `File · <address> · <case_id>` assigned to `File`, which wakes Tarang's agent.

```bash
./naive/setup.sh                                                   # uploads taxappeal-evidence.zip, creates/updates the agent
naive board assign agt_84kdvn48drb35vhrpnzd71ex21 <crd_…> evidence # one real card; watch with naive session list --agent <agt>
```

## Known limitations

- **Find's sales carry the month only**, so every comp is dated the 1st of its month; the time-adjusted price is
  Find's. The county screen is re-run per card because Find's cards omit the `evidence` block (Hendry ≈ 1 min;
  Bay is slower).
- **Only price per sq ft.** No separate adjustments for age, pool, lot or condition; Find's peer groups already
  match those roughly. Owner photos and repair quotes are the condition evidence.
- **Sizes are the county's effective area** (can include garages and porches): fine for like-for-like comparison,
  never quote it to an owner as living area.
- **County level** defaults to 1.0 (no reduction) when the case doesn't carry one.
- **Hearing date** comes from the card; the board sets it after filing, so the exchange deadline is empty until then.
- **Permits and county photos** are a manual `check` item.
- **PDF needs Chrome or Chromium**; without it you get the HTML only.
