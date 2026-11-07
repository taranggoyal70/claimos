# taxappeal-qualify: the Qualify step

Step 2 of the claims engine (Find → **Qualify** → Sign up → Evidence → File → Chase → Escalate → Collect), for the **property-tax desk**. It takes the candidate properties Find produces and decides, with reasons, which ones are worth pursuing, by which filing route, and in what order. Qualified leads go on to Sign up, and from there to Evidence (`taxappeal-evidence/`). It never contacts anyone and never files anything.

**How it works, end to end: [QUALIFY.md](QUALIFY.md).**

## Setup

A standalone TypeScript package. Requires Node 20+ (the repo root targets Node 24).

```bash
cd taxappeal-qualify
npm install
npm run verify            # typecheck + 61 tests + demo; no network or API key needed
```

For the real LLM review, set `QUALIFY_MODEL` in `taxappeal-qualify/.env` (copy `.env.example`). The API key can sit there as `NAIVE_API_KEY`, or in the repo-root `.env` as `VETTA_API_KEY`, which the rest of the repo already uses. Pick a model with `vetta models list --human`.

## Run

```bash
npm run demo                                                                 # synthetic data + offline reviewer
npm run qualify -- run --candidates <file> --config <desk config> [--suppression <file>] [--llm naive|mock|off]
npm run qualify -- show --results out/results.json --case <caseId>
npm run qualify -- review --results out/results.json --case <caseId> --by <name> --approve
npm run qualify -- cases --results out/results.json --config <desk config> --export out/cases.json   # for the UI
npm run qualify -- codes
```

Other steps import it from `taxappeal-qualify/src/index.ts`: `qualifyAll()` for decisions, `toCaseRecord()` / `toQualifyBeat()` for the Claim OS dossier UI.

## Before real use

`config/desk.placeholder.json` and everything in `data/` are made up. Write a desk config with your jurisdiction's real valuation date, filing routes, fees and comp rules, and feed it real candidates from Find.
