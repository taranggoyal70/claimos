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
npm run dev
```

Open <http://127.0.0.1:4173>.

## Naive voice

Locally, authenticate the Vetta CLI and start the server. In Vercel, add `VETTA_API_KEY` as a server-side environment variable. Never expose it to browser code.

## Deployment

The Vercel project and GitHub repository are both named `claimos`. Vercel rewrites clean product routes to the static prototype and runs the Naive voice proxy as Node.js Functions.

See [prototype/README.md](prototype/README.md) for presentation controls and implementation notes.

