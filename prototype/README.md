# Claim OS — Coded Motion Prototype

This is a code-first interaction prototype. It is intentionally separate from production application code.

## Run

```bash
node prototype/server.mjs
```

Open <http://127.0.0.1:4173/index.html>.

The Node server keeps Naïve credentials out of browser code and exposes the local `/api/voice/*` adapter. If a Vetta CLI profile is authenticated, the **Voice** control on `/live.html` cycles through `off → Naïve → browser`. Without authentication it offers the browser fallback.

### Enable Naïve natural voices

```bash
vetta auth register --email YOUR_EMAIL --password 'CREATE_A_PASSWORD'
# click the verification link sent to your email
vetta login --email YOUR_EMAIL --password 'YOUR_PASSWORD'
vetta whoami
node prototype/server.mjs
```

The prototype invokes `vetta media speak` through the authenticated local CLI profile. It does not print or store the credential. A server-side `VETTA_API_KEY` is also supported for deployment.

## Routes

- `/index.html` — spacious editorial story with scroll-bound recovery beats
- `/live.html` — keyboard-controlled live presenter with approval and rejection branches
- `/app.html` — operating company and active-case queue
- `/case.html` — living claim dossier
- `/desks.html` — coordinator capital allocation across recovery desks
- `/intake.html` — “forward any bill, letter or denial” front door
- `/proof.html` — outcomes and external receipts

## Presenter controls

- `→` — next beat
- `←` — previous beat
- `A` — authorize at the filing gate
- `R` — reject at the filing gate
- `C` — toggle captions
- `D` — toggle the detailed event/state view
- `V` — cycle voice mode: off → Naïve → browser
- `Shift+R` — restart
- `T` — toggle theme

## Prototype question

Can a recovery-exchange presentation make an autonomous claims company feel understandable, alive and trustworthy without collapsing every capability into one dashboard?

## Current answer

The split works:

- The story route stays spacious and teaches one idea per viewport.
- The presenter makes voice, evidence, capital allocation and the human boundary visible.
- Operating detail lives on separate product routes.
- The same deterministic case data drives every surface.

Before production, replace the replay data in `assets/demo-data.js` with normalized Naive session, tool, cost, artifact and approval events.
