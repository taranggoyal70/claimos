# Connected local workflow

This integrates Smaran's Qualify PR #1 and Fra's Evidence branch, instead of driving case progress from the presentation replay. At inspection time PR #1 was the only PR; Evidence was on `evidence-step`, and no Find/File PR or branch was present.

## Run

```sh
npm run build
npm run dev
```

Open `/workflow` on the local server (default `http://127.0.0.1:4173`). Node 24 is required for SQLite. Evidence automatically selects an installed Python 3.10+ interpreter. Set `CLAIMOS_PYTHON` when needed. Python runtime dependencies are otherwise empty.

For model review, put `VETTA_API_KEY` (or `NAIVE_API_KEY`) and `QUALIFY_MODEL` in the local `.env` and restart. The SDK is `@usenaive-sdk/managed-agents`; calls use Naïve's model proxy. A missing key/model blocks desks that require review. Explicitly rules-only desk configs execute deterministic Qualify without claiming an LLM review.

An optional `CLAIMOS_OPERATOR_TOKEN` of at least 24 characters protects case APIs. Enter it in the workbench when prompted; it is not saved in browser storage. The server always binds to loopback, validates Host and Origin, and rejects cross-site requests. This is a single-operator local workbench, not a hosted multi-tenant service.

## Imported case contract

`POST /api/workflow?resource=cases` accepts:

- `candidate`: `CandidateSchema` from `taxappeal-qualify/src/types.ts`, including `jurisdictionId: "FL-Lee"`, county-record dimensions, assessment valuation date, comparable sales, owner information, and nonempty provenance source references. Importing is a manual handoff; it is not an automated Find run.
- `config`: `DeskConfigSchema`, with jurisdiction `FL-Lee`, a January 1 valuation date, `saleWindowAfterDays: 0`, current filing windows and the operator's reviewed costs/thresholds. The placeholder config cannot be used. Dates are evaluated against the current date in America/New_York; the workbench does not pin time to the demo date.
- `rules`: `reviewedBy`, calendar-date `reviewedOn`, and an array of HTTPS `sources`. This records the operator's review; it does not claim automated legal verification.
- `evidence`: explicit `justValue` and `countyLevel`; optional `peers` (`parcel_id`, `sqft`, `just_value`), `compAddresses` keyed by comparable ID, and `hearingDate`. `generatePdf` defaults to true. No hearing deadline is invented when the board has not supplied a hearing date.

The UI accepts candidate and config files separately. A candidate file may also wrap the candidate under `candidate` and attach `evidence` options. Financial metadata is entered explicitly in the import form. No synthetic fixture or pre-filled county rule set is offered as real input.

For the first supported slice, `evidence.justValue` must equal `candidate.assessment.assessedValue`. Florida caps and exemption effects are not silently replaced by a comparison of just values; cases with different values require a specialist desk adapter. Area must use the same county-record basis for subject and comparables.

## Actual state transitions

1. Import is validated, fingerprinted and persisted. Identical imports return the existing case.
2. Qualify runs the actual package; no mock reviewer is imported. Required-but-unconfigured Naïve review blocks. Rejected, incomplete, next-cycle and needs-review outcomes stop the handoff.
3. A human can resolve qualifying review concerns with a recorded reason. A missing configured model review cannot be approved around.
4. Upload an existing signed PDF/PNG/JPEG and confirm its signer, parcel/year and scope were reviewed. The app does not create or independently verify an e-signature. Authorization uploads are stored with a checksum.
5. Qualification deadlines, suppression and hard rules are rechecked. Qualified selected comparable IDs feed the actual Python Evidence module over stdin, with fixed executable arguments and no shell interpolation.
6. Evidence produces persisted packet JSON/HTML, the owner's document-request text and PDF when available. `thin` and `no_case` stop the handoff. A `ready` valuation result still retains the checklist and stops at File until that module exists. No message is sent by generating `owner_request.txt`.

## API

All data responses are private/no-store. Case resources require the configured bearer token when one is set.

| Method | Resource query | Behavior |
|---|---|---|
| GET | `capabilities` | Connected modules and configuration booleans only |
| GET | `cases` | Last 100 saved case summaries |
| GET | `cases&id=…` | Actual case result, event trail and artifact metadata |
| POST | `cases` | Import a validated case package |
| POST | `run&id=…` | Run connected steps; retries preserve existing outputs |
| POST | `review&id=…` | Record a human qualification approval with `note` |
| POST | `authorization&id=…` | Attach `signer`, `reviewed: true`, `contentBase64` |
| GET | `artifact&id=…&artifactId=…` | Authenticated attachment download with SHA-256 header |

There is no filing, send-email or charge endpoint. Public Vercel returns `LOCAL_BACKEND_REQUIRED`; it never writes private cases to ephemeral function disk.

## Persistence and verification

SQLite stores cases, immutable artifacts and append-only events in `.claimos-data/`. Use `CLAIMOS_DB_PATH` to choose another local path. A five-minute durable lease prevents concurrent runs of one case. An interrupted run can be retried after the lease expires. Model calls and external actions cannot run through the public demo.

```sh
npm run test:workflow
npm test --prefix taxappeal-qualify
# In an isolated Evidence virtual environment with .[dev] installed:
python -m pytest -q taxappeal-evidence/tests
```

The integration tests use explicitly synthetic fixtures in isolated temporary databases. They test the actual TypeScript/Python execution, authorization gate, missing credentials, persisted reloads, artifact isolation, concurrent calls and deadline rechecks. Browser verification also uses a separate database; it does not add test cases to the operator's real workspace.

## Source references checked

- [Naïve SDK quick start](https://usenaive.ai/docs) for the managed-agents client and runtime model.
- [Florida Statute 194.011](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199%2F0194%2FSections%2F0194.011.html) for the petitioner evidence-exchange provision retained by Evidence.
- [Florida DOR bulletins](https://floridarevenue.com/property/Pages/Cofficial_PTO_Bulletins.aspx) for the referenced PTO BUL 25-02. Operator review is still required for the actual case, county procedure and current dates.
