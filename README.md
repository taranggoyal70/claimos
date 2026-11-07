# Claim OS

Claim OS is an autonomous recovery company built for the Naive Autonomous Company Hackathon at YC.

It finds money owed, qualifies the claim, gathers evidence, obtains authorization, prepares or submits the filing, follows up, escalates denials, and collects a percentage of verified recovery.

## Product surfaces

- `/` — Recovery Exchange story
- `/live` — keyboard-controlled live company presentation
- `/app` — operating company
- `/case` — living claim dossier
- `/desks` — autonomous capital allocation
- `/intake` — forward any bill, letter, or denial
- `/proof` — outcomes and external receipts

## Local development

```bash
npm run build
npm run dev
```

Open <http://127.0.0.1:4173>.

## Real local workflow

Open <http://127.0.0.1:4173/workflow>. The workbench uses private local SQLite state and the actual connected modules:

- **Qualify:** Smaran's merged TypeScript package.
- **Evidence:** Fra's `evidence-step` branch (`51a8295`), executed as Python 3.10+ with a validated handoff adapter.
- Import a sourced `FL-Lee` candidate and operator-reviewed desk config. Placeholder rules are rejected. The current adapter accepts uncapped cases whose assessed value equals the county just value and uses pre-January-1 comparable sales.
- Qualify runs on import. If the desk enables LLM review, a Naïve key and model are required; there is no heuristic fallback in this workspace.
- Operator-reviewed owner authorization unlocks the Python Evidence build. It generates actual HTML, JSON and an owner-document request, plus PDF when Chrome/Chromium is available.
- Generated packets, uploaded authorization, checksums and events persist across restarts in `.claimos-data/cases.sqlite`. This directory is excluded from Git and deployment.

Find, File, Chase, Escalate and Collect backends have not been received in this repository. The workbench stops explicitly at missing modules and never treats a generated packet as a county submission. It sends no outreach and processes no payments. The polished `/live` experience remains a separately labelled simulation.

See [workflow/README.md](workflow/README.md) for the handoff contract, setup and API. Copy `.env.example` to a local `.env` and configure the key/model there if model review is required. Never send keys in chat.

## Naive voice

Locally, authenticate the Vetta CLI and start the server. In Vercel, add `VETTA_API_KEY` as a server-side environment variable. Never expose it to browser code.

## Deployment

The Vercel project and GitHub repository are both named `claimos`. The build publishes only website assets and Node API routes. The public deployment does **not** store real cases; `/workflow` explains how to open the local workbench. A hosted worker, database and operator authentication must be connected before offering hosted real-case processing.

See [prototype/README.md](prototype/README.md) for presentation controls and implementation notes.

