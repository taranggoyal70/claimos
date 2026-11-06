# Naive Autonomous Company Hackathon — Source of Truth

Last updated from participant-provided event information on November 5, 2026.

## Objective

Build a company primarily run by agents using the Naive SDK. The live demo must show what the company actually accomplished: customers found, work delivered, decisions made, money or value created, and where a human intervened.

## Event

- Location: YC office, San Francisco
- Hacking begins: November 7, 2026 at 1:00 PM
- Hacking stops: November 8, 2026 at 11:00 AM
- Final presentations: November 8, 2026 at 1:00 PM
- Winner announcement: November 8, 2026 at 1:45 PM
- Event ends: November 8, 2026 at 2:30 PM
- Attendance: both days required; approved attendees only
- Demo: live; judges focus on how much operates without the builder
- Required platform: Naive SDK

## Current prize targets

### Overall

- First: iPhone 18 Pro / AirPods 5, guaranteed YC interview, and $50,000+ sponsor credits
- Second: Mac Mini / AirPods 5
- Third: Mac Mini

### Named tracks

- Most Likely to Become a Unicorn
- People's Choice
- Best Mobile Automation, powered by MobileRun
- Most Likely to Scale to Millions
- Best Design

The previously discussed categories that do not appear in the participant-provided current listing should not be treated as active unless organizers confirm them onsite.

## MobileRun track

- Agents operate real Android and iOS devices/apps.
- Example actions: publish content, compare quotes, place delivery orders, test apps.
- All teams receive 72 hours of access, device minutes, and six seats.
- iPhones are first come, first served.
- Prize packages run for 12 months:
  - First: three cloud iPhone packages, stated value $8,520
  - Second: two packages, stated value $5,760
  - Third: one package, stated value $3,000

## Sponsors

- Naive — required agent-company runtime
- OpenAI — models and voice/reasoning
- HubSpot — CRM, lifecycle, pipeline and follow-up
- Stripe — payments and revenue evidence
- Vercel — frontend deployment
- OpenRouter — official sponsor; intentionally excluded from our build
- AgentMail — agent-controlled email inboxes
- Luxor — GPU and AI infrastructure
- Monid — official sponsor; intentionally excluded from our build
- Apify — web extraction and automation
- MobileRun — real mobile-device automation
- Render — services, workers and databases

## Selected business direction

### Claim OS

An autonomous recovery company that finds money owed to people, qualifies the claim, assembles evidence, files or prepares the claim, pursues it across channels, escalates denials, and earns a percentage of recovered money.

The company has one shared claims engine and specialized desks. Each desk supplies its own data sources, detection logic, eligibility rules, valuation method, evidence requirements, filing procedure, escalation path, contacts and fee basis.

### Shared recovery engine

1. **Find** — ingest public data or a user-forwarded bill, letter or denial; extract the records and match them to a claimant.
2. **Qualify** — combine deterministic rules with an LLM check; calculate expected value as potential recovery × probability of winning − cost, while accounting for the deadline.
3. **Sign up** — conduct consented outreach, explain the opportunity by email/voice, obtain e-signature and place a payment method on file.
4. **Evidence** — run the desk's evidence checklist, pull available records and ask the claimant for missing items.
5. **File** — fill the correct form, obtain required human authorization, submit or prepare it for submission, save the receipt and calculate the counterparty's response deadline.
6. **Chase** — follow up by email, SMS, fax or voice; attach every reply to the case.
7. **Escalate** — read a denial, select the next permitted appeal step and re-file or request review.
8. **Collect** — verify proof of recovery, invoice/charge the agreed fee and follow up on unpaid fees.

### Desks

- **Property Tax — first production desk:** scan county rolls, identify likely over-assessed homes, obtain an eligible homeowner, build comparable-sales evidence and prepare/file the assessment appeal.
- Every additional desk is treated as a complete recovery business built on the shared engine, not a thin routing demo. It owns real eligibility rules, evidence requirements, filing procedure, follow-up cadence, escalation path, economics and success measurement.
- Different builders may produce their own complete version/desk. The product architecture must allow those versions to plug into the same intake, case ledger, communications, payments, governance and capital-allocation system.

### Front door

> Forward us any bill, letter or denial.

The intake agent parses the document, identifies the claim type, routes supported matters to the correct desk, and clearly declines or waitlists unsupported claim types rather than pretending to handle them.

### Company coordinator

- Track recovery value, probability of success, cost per case, cycle time and revenue per desk.
- Allocate agent budget to the highest expected-return work.
- Pause weak or unsafe work automatically.
- Require approval for legal attestations, filings, material payments and uncertain escalations.

The coordinator compares fully formed desks and cases. It must make visible, defensible capital-allocation decisions: fund the highest expected-return work, cap risk, and pause or shut down work that underperforms.

### Human build team

This is a team build, not a solo build. The current workstream allocation shown in the planning artifact is:

- **Find — Nick:** ingestion, record-to-person matching and upload parsing.
- **Qualify — Smaran:** eligibility, expected-value scoring and deadline logic.
- **Evidence — Fra:** evidence checklist, public records and claimant requests.
- **File — Tarang:** form completion, submission/approval boundary, receipts and response deadlines.

Sign-up, chase, escalate, collect, the coordinator and the control-room UI remain shared integration responsibilities unless reassigned.

Positioning: an owner-authorized claims recovery company/software service, not a law firm. Legal representation is a future licensed-partner pathway.

## Winning demo target

The product vision is evaluated as a complete build. The hackathon presentation may use one property-tax case as the clearest end-to-end narrative, but the underlying architecture must support every desk running the full Find → Qualify → Sign up → Evidence → File → Chase → Escalate → Collect loop.

Desired final evidence:

- Real homeowner or explicitly consented test customer
- Property assessment and comparable-sales evidence
- Estimated annual savings with confidence and assumptions
- Personalized outbound email and inbound reply
- Real voice conversation or consented live voice interaction
- Signed engagement/authorization
- Successful Stripe payment
- Generated evidence packet and completed application
- Naive trace of delegation, tool calls, spend and decisions
- Explicit count of human interventions

Target closing card:

> 1 homeowner · 31 agent decisions · 5 verified comps · $49 revenue · filing-ready case · 1 required human signature

## Sponsor integration strategy

Use sponsors only where they are essential to the business story.

### Core integrations

| Sponsor | Essential role | Demo proof |
|---|---|---|
| Naive | Coordinator, specialist agents, shared work, budgets, identity and traces | Live delegation and decision ledger |
| OpenAI | Structured valuation/reasoning and voice conversation | Explainable analysis and live call |
| Apify | Retrieve county/property/comparable data where permitted | Source-linked evidence |
| HubSpot | Contact, deal stage, tasks and follow-up | Lead becomes a paid case |
| AgentMail | Personalized outreach, reply ingestion and follow-up | Real email thread |
| Stripe | Immediate analysis deposit | Real payment receipt and revenue counter |
| Vercel | Public customer flow and cinematic control room | Live product URL |

### Optional, only if reliable

| Sponsor | Potential role | Adoption rule |
|---|---|---|
| MobileRun | Operate a real phone to inspect a county portal, deliver documents or complete a mobile-only workflow | Include only if it creates a meaningful external action and is stable enough for the live demo |
| Render | Durable background worker or database | Use only if Vercel cannot reliably host the required process |
| Luxor | GPU compute for large valuation or document workload | Probably exclude from the 22-hour MVP unless a concrete need appears |

## Non-negotiable safeguards

- Do not claim a completed tax reduction during the hackathon.
- Do not call the product a law firm without licensed counsel.
- Do not provide individualized legal advice.
- Do not cold-call or auto-email scraped personal contacts without a lawful basis, suppression controls and appropriate consent.
- Require the owner to review/sign any legally required authorization or filing.
- Preserve source links, assumptions and confidence for every comparable and savings estimate.
- Cap agent and transaction budgets.
- Clearly distinguish live external actions from deterministic demo fallbacks.
