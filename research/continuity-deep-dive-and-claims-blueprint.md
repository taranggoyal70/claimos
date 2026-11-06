# Continuity Deep Dive → Claim OS Blueprint

Audited November 5, 2026 from:

- Live story: <https://continuity-demo-tau.vercel.app/index.html>
- Live presenter: <https://continuity-demo-tau.vercel.app/live.html>
- Source: <https://github.com/aiden-guan/continuity>

The goal is to reproduce Continuity's level of clarity, pacing and finish for Claim OS without copying its identity, thread metaphor, procurement story, logo, wording or exact visual system.

## Executive conclusion

Continuity feels exceptional because four systems reinforce each other:

1. **A single visual thesis.** The thread is the product idea, the page structure and the primary motion device.
2. **A controlled story.** One idea occupies one viewport. Motion explains causality, not decoration.
3. **Real operational artifacts.** Emails, state transitions, agent deaths, approvals and benchmark evidence look like the underlying system because they come from it.
4. **A purpose-built presentation layer.** The landing story, interactive presenter and recorded video are separate surfaces built for different jobs.

The Claim OS equivalent should use **the claim dossier and the money trail** as its visual thesis.

## Audit scope

### User goal

Understand how Continuity achieves its visual and demo quality, then translate the methods into a full design and implementation plan for an autonomous claims-recovery company.

### Surfaces inspected

- Landing hero and navigation
- Light/dark theme
- Problem section
- Email-to-state mechanism animation
- All eight landing-page replay beats
- All four benchmark detail interactions
- All four chart detail interactions
- Live presenter from empty state through the approval gate
- Reject branch
- Approve-and-send branch and closing card
- Browser warnings/errors
- Static site source, CSS tokens, JavaScript motion modules and responsive rules
- Replay snapshot and live/server mode boundary
- Playwright, FFmpeg and Remotion video pipeline
- Git history and build chronology

## Step-by-step audit

### 1. Hero and theme — healthy

Observed:

- Full-viewport opening with one two-line thesis: “Agents forget. The thread doesn’t.”
- A faint animated conversation network sits behind the copy.
- The first line continuously disintegrates/reassembles while the second remains stable.
- A canvas thread at the fold runs through events and agent lifetimes.
- Light and dark modes both preserve hierarchy and motion.
- Primary and secondary calls to action are obvious.

Why it works:

- The first screen demonstrates the concept before explaining it.
- Motion makes “forgetting” visible.
- The illustration and headline share one metaphor.
- There is no feature grid competing with the thesis.

Source:

- `site/index.html`
- `site/assets/landing.js` — 17-second hero loop, event/agent model, scale readout
- `site/assets/network.js` — ambient agent field
- `site/assets/particles.js` — headline dissolve/reassembly
- `site/assets/theme.js` — persistent theme toggle

### 2. Problem framing — healthy

Observed:

- Three claims only: cost grows, accuracy falls, handoffs reset.
- Numeric evidence animates into view.
- Tiny source copy supports rather than competes with the claim.

Why it works:

- The problem is compressed into a memorable progression.
- Each claim is measurable.
- The product is not introduced until the pain is legible.

### 3. Mechanism replay — excellent

Observed replay sequence:

1. The inbound email is typed.
2. Important phrases are underlined.
3. Fine orange paths connect phrases to state fields.
4. The previous delivery term is struck through.
5. A replacement term appears.
6. A requirement flips to failing.
7. An owed document appears.
8. The next action changes.

Why it works:

- The animation answers “how?” with one concrete transformation.
- Provenance stays visible.
- The change is reversible through a Replay control.
- Timing is slow enough to understand.

Source:

- `site/assets/mechanism.js`
- `site/assets/landing.css` mechanism section

### 4. Eight-beat replay — excellent

All eight controls worked:

1. Agent A opens the deal.
2. Supplier says yes.
3. Agent A is killed.
4. Finance approves.
5. Deal changes.
6. Agent B wakes with no memory.
7. Supplier fixes it.
8. Agent C closes it.

Every beat changes the same four structures:

- Timeline/agent shift
- Stored events
- Structured state board
- Current agent memory/read state

Notable techniques:

- The section is pinned while scroll position selects a beat.
- Direct node clicks jump to a beat.
- Sequential forward motion animates; large jumps render the final state immediately.
- New events fly into the state rows they change.
- State values use mechanical split-flap animation.
- Agent death glitches, then shatters into particles.
- A new agent visibly reads the board rather than the event log.

Source:

- `site/assets/relay.js`
- `site/assets/landing.css` replay section
- `site/assets/snapshot.json`

### 5. Results and evidence — excellent

Observed:

- Primary metrics count from zero after the section enters.
- A delayed impact reveals additional memory-comparison metrics.
- Selecting any benchmark replaces the empty left rail with methodology and a data table.
- Selecting any chart does the same for scale/cost evidence.
- Every result states the sample, comparison basis and source file.

Why it works:

- The page does not ask the viewer to trust a marketing claim.
- Detail is available on demand without cluttering the default view.
- Hover, focus and click all select evidence.

Source:

- `site/assets/charts.js`
- `site/assets/charts.css`
- `site/assets/landing.js::setupBenchSpec`

### 6. Live presenter — excellent

Observed:

- Opens from an intentionally empty inbox and memory panel.
- A single Next control/arrow key advances the story.
- Left side shows what an ordinary agent/inbox sees.
- Right side shows the structured memory graph.
- Captions explain the current beat.
- A spotlight directs attention to the exact changing region.
- Emails appear inside a familiar Gmail-like interface.
- The graph grows from the event evidence and keeps superseded state visible.
- Agent processes die and restart with visible memory/token facts.

This is not a reskin of the landing page. It is a separate presenter application driven by the same underlying snapshot or live engine state.

Source:

- `site/live.html`
- `site/assets/live.js`
- `site/assets/live.css`
- `site/assets/graph.js`

### 7. Human approval branches — healthy

Observed:

- At the binding $5,740 commitment, the flow pauses.
- The card explains the action, price and quantity.
- Reject produces “Nothing was sent.”
- Approve inserts the sent email and completes the order.
- The final card reports three agents, eight emails, two threads and zero shared-memory messages.

Why it works:

- Human intervention is presented as governance, not a failure of autonomy.
- The irreversible action has a clear boundary.
- Both outcomes are implemented.

The public site runs in replay mode when the engine is unavailable. In replay mode both approval controls modify local recorded state only; they do not send a real order.

### 8. Closing state — excellent

Observed:

- Background defocuses.
- One centered result replaces the operating interface.
- The final line restates the thesis with quantified proof.

This produces a clean applause moment and should be copied as a presentation pattern, not as visual styling.

## Browser findings

- No console warnings or errors were observed during the inspected run.
- Navigation, theme, replay, beat selection, benchmark selection, chart selection, presenter progression, rejection and approval all worked.
- Delayed counters and graph/state transitions are intentional; the page rewards waiting.

## Accessibility strengths

- Skip link
- Semantic headings and buttons
- ARIA labels for canvases and presenter controls
- Focusable benchmarks/charts
- Keyboard presenter controls
- `aria-live` on changing replay captions
- `prefers-reduced-motion` handling throughout the motion system
- Touch/click alternatives for hover details

## Accessibility risks to avoid in our build

- Very faint labels can fall below comfortable contrast.
- Several mono labels are extremely small.
- Canvas/SVG illustrations need equivalent structured text, not only a one-line label.
- Scroll-driven pinned storytelling can disorient users without explicit progress and replay controls.
- Color communicates state frequently; icons/text must carry the same meaning.
- The live experience can move for several seconds after a click; provide visible busy state and pause/replay controls.

## Exact frontend architecture

The public experience is not Next.js, Tailwind, shadcn or a component library.

### Story site

- Handwritten semantic HTML
- Custom CSS
- Vanilla ES modules
- Canvas 2D for the hero thread and particle effects
- SVG for graphs and charts
- Web Animations API for local transitions
- `requestAnimationFrame` for continuous/physics-like motion
- `IntersectionObserver` for reveals and charts
- `ResizeObserver` for layout-dependent motion
- CSS custom properties for tokens and state
- Static JSON snapshot for deterministic replay
- No build step

Approximate current size:

- Story/live site assets: 7,865 lines
- Site + video: 60 files, 19,130 lines

### Design tokens

Core light palette:

- Background `#f3f2ee`
- Surface `#fbfaf8`
- Ink `#161513`
- Muted `#7b7871`
- Faint `#b5b2aa`
- Signal `#e2501d`
- Success `#2c7a4b`

Core dark palette:

- Background `#0f0f0e`
- Surface `#171716`
- Ink `#eceae4`
- Signal `#ff6a3d`
- Success `#5dc48a`

Typography:

- Geist for headings/body
- Geist Mono for data, captions, sources and controls
- Tight display tracking, restrained weights

Motion:

- Primary ease `cubic-bezier(0.22, 1, 0.36, 1)`
- Secondary ease `cubic-bezier(0.65, 0, 0.35, 1)`
- Reveals typically 0.6–1.4 seconds
- Small transitions 0.15–0.45 seconds
- Long-running semantic loops 1.4–17 seconds

### Motion module map

| File | Responsibility |
|---|---|
| `motion.js` | word splitting, glyph scramble, number counting, nav progress |
| `particles.js` | hero headline dissolves into event nodes as the page scrolls |
| `network.js` | ambient background field of agents/messages |
| `mechanism.js` | staged email-to-state transformation |
| `relay.js` | pinned eight-beat replay derived from real snapshot data |
| `charts.js` | line drawing, bar rise, metric impact and evidence details |
| `dither.js` | WebGL dither effect used sparingly for the wordmark |
| `graph.js` | live evidence/state/agent graph |
| `live.js` | server/replay modes, presenter state machine, mail rendering, captions, spotlight, approvals and finale |

## Video pipeline

Continuity's published demo video is programmatic:

1. Start the real stage server and agent processes.
2. Drive the story with Playwright.
3. Capture every Chrome repaint through the DevTools screencast API.
4. Convert variable-rate JPEG frames to 1080p/30 H.264 with FFmpeg.
5. Record exact beat start/end times in `timeline.json`.
6. Generate narration using ElevenLabs, OpenAI or macOS voice.
7. Use Remotion to align real footage to narration.
8. Speed slow work only enough to match the spoken line; do not remove it.
9. Add captions, crossfades, thesis card and closing wordmark.

Important: OpenScreen was not used for this Continuity demo. The repository documents Playwright + CDP + FFmpeg + Remotion.

Source:

- `video/scripts/record.mts`
- `video/scripts/narrate.mts`
- `video/src/plan.ts`
- `video/src/Demo.tsx`
- `video/src/script.json`

## How it was built so quickly

Repository history shows:

- First commit: October 17, 2026 at 2:00 PM Pacific
- Last public build commit: October 18, 2026 at 8:36 AM Pacific
- 119 commits in roughly 18.5 hours
- First commit already contained 152 files and 28,771 inserted lines
- 118 commits attributed to Aiden and one collaborator commit
- Merge history includes multiple `claude/...` branches
- Design work continued through the night, with dense iteration around 1–3 AM and 7–8 AM

The pattern is consistent with:

- a large AI-assisted initial scaffold
- parallel feature/fix branches
- a human making rapid taste and scope decisions
- repeated browser/demo verification
- a separate presentation pass near the deadline

The polish did not come from a secret frontend library. It came from a strict story, custom motion modules and many small revisions.

## What we should adopt

1. One visual metaphor shared by product, website and demo.
2. One idea per viewport.
3. Real data driving every story beat.
4. Deterministic JSON replay when live systems fail.
5. A separate presenter route controlled by keyboard.
6. A human approval as the dramatic climax.
7. Source-linked evidence beside every major claim.
8. Long, deliberate motion for causal changes; short motion for interface feedback.
9. A closing card that quantifies autonomy, outcome and human intervention.
10. A programmatic video pipeline built from the real run.

## What we should not copy

- Continuity name, copy or logo
- Thread metaphor
- Exact cream/orange/black palette
- Procurement storyline
- Inbox/memory split as the same composition
- Split-flap state board as the dominant visual
- Exact Geist typographic treatment
- Graph geometry or animation timing

## Claim OS: translated design system

### Visual thesis

**A claim begins as scattered evidence. The company assembles it into a money trail.**

Continuity's thread becomes our Money Trail:

```text
possible value → qualified value → authorized claim → filed amount → recovered cash → fee
```

### Primary object

The center of every screen is a living Claim Dossier containing:

- Claimant
- Desk
- Recoverable amount and expected value
- Eligibility and deadline
- Evidence exhibits
- Communications
- Filing status and receipt
- Escalation ladder
- Payment and fee
- Provenance for every field

Agents are visible only through the work they perform on the dossier.

### Recommended identity

Do not use Continuity's palette directly.

- Dossier paper `#F4F7F8`
- Cold white `#FCFDFD`
- Carbon `#12191E`
- Registry blue `#1D4B63`
- Recovery green `#1B7A55`
- Risk amber `#D98A28`
- Denial red `#B94B45`
- Rule `rgba(18,25,30,.12)`

Typography:

- Instrument Sans or Manrope for product/display text
- IBM Plex Mono for evidence, case numbers, timestamps and money math
- No decorative serif in the core application

### Story site structure

#### Hero

Thesis:

> Money gets lost in paperwork. We recover it.

Visual:

- Scattered bills, notices and denials enter as faint records.
- The Money Trail identifies one recoverable amount.
- A case dossier assembles.
- The recovered amount reaches the revenue ledger.

#### Problem

Three measurable failures:

- People do not know they are owed money.
- Evidence and deadlines break legitimate claims.
- Follow-up stops before recovery.

#### Mechanism

Animate one forwarded assessment notice into:

- claim type
- filing deadline
- estimated recovery
- evidence checklist
- best next action
- required human authorization

Every field keeps a line back to the exact source region.

#### Replay

Eight beats:

1. County roll or forwarded notice enters.
2. Opportunity agent identifies a likely over-assessment.
3. Eligibility agent validates deadline and expected value.
4. Outreach/voice agent reaches the claimant.
5. Claimant supplies missing evidence and signs.
6. Evidence agent creates the comparable-sales packet.
7. Filing agent prepares the appeal; coordinator pauses for authorization.
8. Owner approves, filing is delivered, payment/revenue is recorded and follow-up begins.

#### Results

Show only sourced metrics:

- opportunities scanned
- cases funded/rejected
- evidence completeness
- time to filing-ready packet
- claimant conversion
- real revenue collected
- projected recovery
- human interventions
- cost per qualified case

### Live presenter layout

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ CLAIM OS  desk P&L · recovery · revenue · autonomy · cost │
├────────────────────┬────────────────────────────┬───────────────────────┤
│ A CLAIMANT         │ B CLAIM DOSSIER            │ C MONEY TRAIL         │
│                    │                            │                       │
│ voice transcript   │ eligibility                │ value at each stage   │
│ email/SMS/fax      │ evidence exhibits          │ deadline/risk         │
│ uploaded notice    │ decisions + provenance     │ agent work + budget   │
│ signature/payment  │ filing + receipt           │ revenue and outcome   │
└────────────────────┴────────────────────────────┴───────────────────────┘
```

Continuity uses “inbox versus memory.” We should use “claimant reality versus company case versus economic outcome.”

### Voice treatment

Voice must be part of the dossier, not a floating call widget:

- Waveform runs beside the active timeline event.
- Each confirmed statement becomes a structured fact.
- The source timestamp remains clickable.
- Uncertain facts stay tentative.
- The voice agent can visibly consult Eligibility or Evidence while keeping the call open.
- The call ends by triggering the exact next artifact: evidence request, signature or payment.

### Dramatic approval

The final live gate should say exactly what is happening:

```text
FILING AGENT NEEDS YOUR AUTHORIZATION

Submit this appeal to San Francisco AAB?
Claimed value: $1,104,000
Requested reduction: $86,000
Estimated annual savings: $1,018
Filing fee: $120

[A] Authorize and file     [R] Reject
```

If an actual filing is unavailable or inappropriate, label the action honestly as “Generate filing-ready packet” or “Send packet to owner for submission.”

## Implementation blueprint

### Routes

- `/` — editorial product story
- `/live` — keyboard-controlled presenter
- `/app` — operating control room
- `/case/:id` — living dossier
- `/desk/:desk` — desk queue and economics
- `/proof` — sources, outcomes and demo evidence

### Stack

- Next.js/React deployed on Vercel
- Custom CSS variables and CSS modules or one disciplined global layer
- No stock component library in the presentation surfaces
- SVG for dossier/evidence/money graphs
- Canvas only for the hero or particle moments that materially need it
- Web Animations API for deterministic beat transitions
- Server-sent events or streamed Naive events for live operation
- Static `demo-snapshot.json` for replay/fallback
- `prefers-reduced-motion` supported from the first motion primitive

### Presentation modules

```text
ui/story/motion.ts
ui/story/money-trail.ts
ui/story/claim-mechanism.ts
ui/story/recovery-replay.ts
ui/story/results.ts
ui/live/demo-controller.ts
ui/live/claimant-channel.ts
ui/live/dossier.ts
ui/live/money-trail.ts
ui/live/approval-card.ts
ui/live/finale.ts
data/demo-snapshot.json
```

### Required event model

Every UI beat must derive from events rather than presentation-only booleans:

```ts
type ClaimEvent = {
  id: string;
  caseId: string;
  occurredAt: string;
  actor: string;
  kind:
    | "source_found"
    | "eligibility_decided"
    | "contacted"
    | "call_fact_confirmed"
    | "evidence_added"
    | "authorization_signed"
    | "payment_received"
    | "filing_prepared"
    | "filing_submitted"
    | "denied"
    | "escalated"
    | "recovery_verified";
  inputRefs: string[];
  decision?: { chosen: string; alternatives: string[]; reason: string; confidence: number };
  externalReceipt?: string;
  costUsd?: number;
  humanIntervention?: boolean;
};
```

### Demo controller

- Arrow Right: next beat
- Arrow Left: previous beat
- A: approve
- R: reject
- C: captions
- D: details
- Shift+R: restart
- Space: pause/play automatic choreography

The default presenter waits for the operator between beats. Animations inside each beat may continue, but an explicit ready indicator shows when the next beat is safe.

### Real/live and replay modes

```text
Naive live stream available
  → render live sessions, tools, costs, artifacts and approvals

Naive unavailable or demo reset requested
  → replay the checked-in successful run from demo-snapshot.json
  → display “recorded verified run” visibly
```

Never silently replace a failed live action with fake success.

## Video blueprint

Use the proven Continuity pipeline:

1. Run the real company scenario.
2. Use Playwright to trigger presenter beats.
3. Record the browser at 1920×1080.
4. Save a machine-readable timeline.
5. Write a short narration file with one line per beat.
6. Generate narration.
7. Use Remotion to edit the real footage, captions and closing card.
8. Export a 60–90 second backup film.

OpenScreen can be used for quick manual takes, but the deterministic final film should come from the programmatic pipeline because it is repeatable and source-controlled.

## Acceptance bar for our build

- A first-time judge understands the company within 10 seconds.
- Every visual change maps to a real case event.
- The live route reaches a real approval and a real artifact.
- Voice facts enter the dossier with timestamped provenance.
- The Money Trail visibly changes as confidence, cost and recovery change.
- At least one failure/rejection branch works.
- The final card reports outcome, revenue, agent decisions and human interventions.
- Light and dark themes are both intentional.
- Keyboard, focus, touch and reduced-motion paths work.
- The static replay can be run without Naive, email, phone or payment services.
- The backup video is generated from a real run, not manually faked.
