# Claim OS — Perfect Demo Experience

## Design method — code first

Static image generation is not the visual target for this product. It cannot express the qualities taken from the Continuity reference: full-viewport pacing, sticky scroll scenes, timed causality, keyboard-controlled demo beats, delayed evidence reveals, branching approval states and a live-to-replay data boundary.

Design and validate the experience as an interactive browser prototype from the beginning. Screenshots may document a working state, but they must not define the product.

Non-negotiable structure:

- Separate routes for the editorial story, live presenter, operating app, case dossier, desk economics, intake and proof.
- One idea per viewport on the story route.
- Scroll progress selects story state; it does not merely fade sections into view.
- Every animated state is derived from a real or recorded claim event.
- The presenter waits between major beats and uses timed sub-scenes inside each beat.
- A checked-in replay snapshot preserves the same state machine when integrations are unavailable.
- No generated-dashboard image is to be treated as an implementation reference.

## Product thesis

The interface should make invisible recovery work visible. Every conversation, decision, deadline, document, filing, payment and escalation becomes part of one living claim dossier.

The visual experience must prove that a company is operating. It is not a collection of agent chat windows.

## Aesthetic direction: The Recovery Desk

Draw from the actual materials of claims work: case folders, official forms, evidence exhibits, filing receipts, timestamps, authorizations, correspondence and financial ledgers.

Avoid generic dark neon agent dashboards, stock shadcn cards and decorative network graphs.

### Palette

- `Archive White #F5F7F8` — primary case surface
- `Carbon #161A1D` — text and high-authority controls
- `Docket Blue #173B57` — navigation, filed states and official records
- `Evidence Amber #F2C94C` — missing or contested evidence
- `Recovery Green #159A68` — verified savings, payments and wins
- `Escalation Red #D4473F` — denials, deadlines and intervention

### Typography

- Display/case titles: **Archivo Black** or a similarly compact grotesk
- Body/operations: **IBM Plex Sans**
- Evidence, timestamps and amounts: **IBM Plex Mono**
- Generated filings retain the county form's original typography rather than being re-skinned

### Shape language

- Case files and evidence sheets use restrained 2–4px radii.
- Statuses appear as docket stamps and edge tabs, not floating pills.
- Lines encode provenance, delegation or money movement; they are never decorative.
- Every external action carries a timestamp and source.

## Signature element: the Money Trail

A single continuous line travels through the company:

```text
possible recovery → qualified value → signed claim → filed amount → recovered cash → company fee
```

It begins gray and uncertain. Evidence increases its opacity and width. Risk or missing information makes it amber. Denial turns the relevant segment red. Verified recovery turns it green and flows into the revenue ledger.

This is the one expressive visual device. Everything else remains disciplined.

## Main control room

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ CLAIM OS   Recovery $…   Revenue $…   Autonomy …%   Budget $… │
├───────────────┬───────────────────────────────────────┬──────────────────────┤
│ DESKS         │ LIVING CLAIM DOSSIER                  │ LIVE OPERATIONS      │
│               │                                       │                      │
│ Property Tax  │ Claim header + deadline               │ Voice / email / SMS  │
│ Other desks   │ Money Trail                           │ Agent actions        │
│               │ Evidence exhibits                     │ Approvals            │
│ queue + P&L   │ Decisions + alternatives              │ External receipts    │
├───────────────┴───────────────────────────────────────┴──────────────────────┤
│ EVENT LEDGER: every delegation, tool call, decision, cost and intervention  │
└──────────────────────────────────────────────────────────────────────────────┘
```

The center is always the claim, not the agents. Agents appear only when they act on the case.

## Voice as an operating surface

### Before the call

- Show why the call is happening, the permitted purpose, consent state and agent objective.
- Display the maximum promises the voice agent may make.
- Show the facts it may use and the facts it must verify.

### During the call

- Use a restrained waveform integrated into the dossier's vertical timeline.
- Separate customer and agent speech through typography and alignment, not chat bubbles.
- Convert important speech into structured case events in real time:
  - identity confirmed
  - owner occupancy confirmed
  - assessed value disputed
  - missing document promised
  - fee accepted
  - authorization requested
- Pin each extracted commitment to the exact transcript moment that supports it.
- Show the voice agent consulting another agent without interrupting the customer.
- Display uncertainty and escalation honestly: “Checking filing eligibility” is better than false confidence.

### After the call

- Generate a concise call outcome, commitments, next actions and compliance record.
- Update HubSpot, the claim dossier and the coordinator's expected-value model.
- Trigger the correct email, signature request or evidence request automatically.

## Visualized autonomy

Every agent action should emit one event with:

- actor
- goal
- input/source
- decision and alternatives considered
- external action
- cost
- confidence
- result
- whether a human intervened

The UI should support two modes:

- **Operate:** calm current-state view used to run the company.
- **Explain:** demo view that expands the reasoning, evidence and provenance behind the selected event.

## Agent team representation

Do not show agents as cartoon avatars or floating chat bubbles. Represent them as named operational roles attached to work:

- Intake
- Opportunity
- Eligibility
- Outreach
- Voice
- Evidence
- Filing
- Chase
- Escalation
- Collections
- Capital Allocator

When delegation occurs, the case file visibly moves to the responsible role and returns with a concrete artifact or decision.

## External proof drawer

One keystroke opens the proof for the current story beat:

- public-source record
- email sent and reply received
- call recording/transcript with consent state
- signed authorization
- Stripe payment receipt
- county form
- filing confirmation or clearly labeled filing-ready packet
- Naive session/tool trace

Nothing important should rely on narration alone.

## Human intervention design

Human checkpoints are presented as governance, not failure.

An approval card must show:

- exact action about to occur
- legal or financial reason approval is required
- evidence supporting it
- deadline
- consequences of approve/deny
- immutable record of the decision

The ideal demo has one consequential checkpoint: the claimant's legally required authorization or the operator's approval to file.

## Sound design

Sound is sparse and functional:

- soft line-open tone when the voice call connects
- low paper-lock sound when evidence becomes verified
- short docket stamp when filing is accepted
- restrained payment confirmation when revenue is collected
- urgent but non-alarming pulse for an expiring deadline

No continuous sci-fi ambience and no sound for ordinary card movement.

## Perfect live-demo sequence

### 0–12 seconds — The opportunity

The system scans a roll or receives a forwarded assessment notice. Thousands of records collapse into one high-value case. The Money Trail appears with estimated recovery and confidence.

### 12–35 seconds — The decision

Eligibility and valuation agents assemble evidence. The coordinator funds the case and rejects a weaker alternative, showing why.

### 35–85 seconds — The customer

The voice agent calls the consented homeowner. Requirements and commitments become structured case events live. A difficult question causes a specialist consultation and recalculation.

### 85–115 seconds — The transaction

The customer receives an email, signs authorization and pays. HubSpot advances the deal; Stripe revenue enters the ledger.

### 115–150 seconds — The delivery

Evidence exhibits assemble into the county packet. The owner or operator provides the one required approval. The filing agent submits or produces a clearly labeled filing-ready package and saves the receipt/deadline.

### 150–175 seconds — The company learns

The coordinator updates case economics, changes the desk's budget and schedules follow-up. A denial branch can be replayed to show autonomous escalation.

### Closing frame

```text
1 claimant
1 paid engagement
5 verified exhibits
31 agent decisions
$49 revenue collected
$980 potential annual recovery
1 required human authorization
```

## Failure behavior

The product must look credible when something goes wrong:

- uncertain match → hold outreach and request verification
- insufficient evidence → explain the missing exhibit and stop filing
- missed deadline → route to the next permitted remedy or decline
- failed email/call → switch channel according to consent policy
- denial → summarize the reason, calculate appeal expected value and escalate or close
- payment failure → preserve the claim and run a transparent collection workflow

Failures remain part of the dossier and decision ledger; they are never silently hidden.

## Build quality bar

- Responsive at presentation resolution and laptop resolution
- Keyboard-controlled demo beats
- Reduced-motion mode
- Deterministic reset and replay
- Live data clearly distinguished from fallback data
- No placeholder lorem ipsum or anonymous “Agent 1” labels
- Every number traceable to a source or formula
- Every external action backed by a receipt or event
