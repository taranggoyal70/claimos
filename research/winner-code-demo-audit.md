# YC winner code and demo audit: closest analogues to the Naïve hackathon

Research date: 2 November 2026

## What was actually inspected

This is a second-pass technical audit of seven projects selected as close analogues to the Naïve Autonomous Company Hackathon: Manceps, the Call My Agent winner later associated with Cyclon, JailCall, Chief, Support AGI, Bake-Off, and ReadyLead.

I used first-party organizer pages, public project pages, public GitHub repositories, repository source files, README/specification files, and demo scripts. I cloned four public repositories into a temporary directory for static inspection: Chief, JailCall, Support AGI, and Bake-Off. I did **not** install dependencies, execute the applications, call external services, or run untrusted code.

YouTube links were located for Gavel, JailCall, Chief, and ReadyLead, but their videos did not expose a usable transcript through the research interface. Therefore this report says **demo link located, not independently watched**. For Support AGI, the repository's exact two-minute demo script and staging commands were inspected; that is not the same as watching the final recording.

## Important correction: Gavel won, not Cyclon

The official AgentPhone results page identifies **Gavel** as the first-place Call My Agent project. Gavel's team included Adam Zinebi and Thomas Kiefer, who later founded **Cyclon**, an AI-native phone company. Cyclon's YC company page says its founder won the hackathon, but the winning hack itself was Gavel. The earlier archive should name Gavel in the first-place project cell and may note Cyclon as the follow-on company.

Primary source: [AgentPhone's official results page](https://agentphone.ai/callmyagent).

## Artifact availability

| Project | Public code | Public demo | Static code inspected | Confidence |
|---|---|---|---|---|
| **Manceps** | No matching public repository located | No public demo located | No | Medium: official winner description, no technical artifact |
| **Gavel / Cyclon** | Organizer's GitHub link now returns 404 | [Demo link](https://youtu.be/LDuc6xvokWU) located, not independently watched | No | High for workflow/stack from official organizer; low for internals |
| **JailCall** | [GitHub](https://github.com/souvik1997/JailCall-call-my-agent-hackathon) | [Demo link](https://www.youtube.com/watch?v=c1eKOdi0hDc) located, not independently watched | Yes | High |
| **Chief** | [GitHub](https://github.com/bliu8/chief) | [Demo link](https://youtu.be/oMDnyMOsFhs) located, not independently watched | Yes | High |
| **Support AGI** | [GitHub](https://github.com/ToukoUrsin/own-your-intelligence-hack) | Repository contains the exact demo script; [submission video](https://youtu.be/mMXawrgPYSY) was located but not independently watched | Yes | High |
| **Bake-Off** | [GitHub](https://github.com/markmdev/bake-off) | No clearly attributable public hackathon demo located | Yes | High for implementation; medium for the on-stage presentation |
| **ReadyLead** | Official page says “GitHub repo coming soon” | [Demo link](https://www.youtube.com/watch?v=GSe8ArMNCjc) located, not independently watched | No | Medium |

## 1. Manceps

### Public evidence

Emergent's official announcement describes Manceps as an AI freight-dispatch platform for independent dispatchers and small fleets. The agents track truck availability, match loads, and coordinate with brokers and drivers. The problem came from Aryan Daga's family logistics business in India. Source: [Emergent winner announcement](https://www.webwire.com/ViewPressRel.asp?aId=363611).

No matching GitHub repository, public application URL, architecture document, or demo recording was located. An unrelated older company also named Manceps dominates search results and should not be confused with this project.

### What can be concluded

- **External actions:** The official description claims load matching and coordination with brokers/drivers, but it does not say whether the hackathon build placed real calls/messages or used staged data.
- **Autonomy:** The product framing is operational rather than advisory, but autonomy cannot be verified without the demo or code.
- **Proof:** It had strong founder-market fit and a clear small-business user. No public outcome metric, customer result, or transaction receipt was found.
- **Likely winning signal:** A painfully manual vertical workflow, a founder with direct domain access, and a product that can be explained in one sentence.

### Reusable lesson for Naïve

Choose a business process that one founder knows from lived experience. The story “my family does this in spreadsheets and phone calls” gives the demo instant credibility even before the agent acts.

## 2. Gavel, with Cyclon as the follow-on company

### Public evidence and workflow

The official organizer says Gavel works like this: text it an item to sell; it posts the listing, talks to interested buyers, negotiates the price, schedules pickup, and contacts the owner once a buyer is on the way. It was built with Google DeepMind, Browser Use, AgentMail, and AgentPhone. Source: [AgentPhone results](https://agentphone.ai/callmyagent).

The organizer's GitHub link points to `thomaskiefer/gavel`, but the repository is no longer public. A demo link exists, but the video was not independently watched in this audit. Cyclon's [YC company page](https://www.ycombinator.com/companies/cyclon) describes the later company as a phone where AI is the interface; that is follow-on evidence, not the Gavel codebase.

### What can be concluded

- **External actions:** Posting a real marketplace listing, messaging buyers, negotiating, and scheduling pickup form a complete sell-side loop.
- **Autonomy:** High by the organizer's description: the human supplies the item and then waits for the pickup notification.
- **Guardrails:** No public source reveals price floors, prohibited-item checks, identity verification, approval thresholds, or negotiation limits.
- **Proof:** The demo premise is unusually strong because every step produces an external artifact: listing, buyer conversation, agreed price, and pickup time.
- **Likely winning signal:** It converts one natural-language instruction into a visible real-world transaction chain. The final notification is a clean “company finished the job” moment.

### Reusable lesson for Naïve

Design the company around a single initiating instruction and a single completion receipt. Hide intermediate complexity in the system, but expose the receipts to judges.

## 3. JailCall

### Architecture verified in the repository

JailCall is a real inbound phone workflow. AgentPhone receives the call and sends signed webhooks to FastAPI. Gemini 2.5 Flash-Lite runs a bounded tool loop. Moss searches a prebuilt index of 57 Bay Area criminal-defense firms and returns positional firm IDs. AgentMail sends parallel intake emails. Supermemory stores caller utterances, dispatch records, and attorney replies. Browser Use is deliberately kept out of the live path; it was used offline to enrich the firm corpus. Source: [repository README and architecture](https://github.com/souvik1997/JailCall-call-my-agent-hackathon).

The public source contains a complete cross-call demonstration:

1. The caller provides only a name and charge.
2. Moss selects three firms.
3. Three intake emails are dispatched in parallel.
4. An attorney reply arrives through an AgentMail webhook and is stored.
5. On the second call, the agent greets the caller by name, remembers the charge, surfaces the reply, and refuses to repeat the dispatch.

### Real implementation strengths

- HMAC-SHA256 verification and timestamp freshness checks protect AgentPhone webhooks.
- The model never invents firm contact details. It echoes a tiny positional `firm_id`; the server resolves real metadata.
- Re-dispatch is blocked in code, not merely discouraged in the prompt.
- The model loop is capped at ten iterations and retries only failures before the first spoken output, avoiding duplicated speech.
- Supermemory failures log and degrade rather than crashing the live phone path.
- The demo dashboard exposes transcript, candidates, tool calls, and dispatch state so judges can see the invisible work.

### Important limitations found in source

- The current build is explicitly a **single-caller demo** using one shared memory tag.
- Startup clears the entire demo memory and tool-call log.
- A designated law firm is force-prioritized for the demo happy path.
- Approximately 22 of 57 firms use generated `noreply@domain` placeholders; sends to them are skipped while still producing placeholder dispatch records. The README says only about six emails were found by Browser Use and 29 were curated from the seed corpus.
- The facility phone number in source is a non-real demo number, and the current facility is hardcoded.
- No conventional test suite was found in the cloned repository, though it contains an interactive evaluation harness and detailed specs.

### Demo structure

The repository supplies a six-beat script: emotional framing, first live call, visible parallel emails, simulated attorney reply, second live call demonstrating memory, and a closing line. The second call is the real “wow” beat; it proves the system is not a one-turn voice wrapper.

### Why it likely won

It combines an immediately serious problem with a very small intake, fast real actions, cross-session memory, and a demo that visibly changes state between two calls. The sponsor stack is architecturally justified rather than decorative.

### Reusable lesson for Naïve

Create a two-cycle demo. Cycle one should generate real company state; cycle two should prove the company remembered the first cycle and made a better/non-duplicative decision.

## 4. Chief

### Architecture verified in the repository

Chief is an Electron desktop app with a Python backend. Local microphone audio flows through an AudioWorklet/VAD and ElevenLabs transcription. It resolves speaker identity locally, hydrates a frozen counterparty briefing, and uses Moss/Supermemory for retrieval and durable claims. Claude Haiku handles the latency-sensitive `silent` versus `whisper` decision. Claude Sonnet handles slower actions off the hot path. AgentMail, Google Calendar, Google Drive, Browser Use, Brave Search, and AgentPhone support action cards and side calls. Source: [Chief repository](https://github.com/bliu8/chief).

The cloned repository contains 161 statically discoverable Python test functions across decision behavior, decoys, fallbacks, memory, claims, calendar/Drive adapters, approvals, hang-up replay, and error degradation. The tests were not executed in this audit.

### Real implementation strengths

- The default output is silence; interruption is treated as a scarce resource.
- The hot decision has a hard timeout and degrades to silence.
- Slow retrieval, belief updates, claim extraction, and action planning run in background threads.
- Memory is frozen during a call; new claims are consolidated after the call, reducing mid-call contamination.
- Voice identity helps prevent the system from acting on the counterparty's commitments.
- Irreversible actions such as sending mail or placing a call require approval.
- Pending, approved, dismissed, and executed action-card states are tested, including idempotent end-of-call flushing.

### Demo-specific scaffolding and limitations

- The source explicitly calls the deterministic runway-contradiction rule a **demo safety net**. If the model times out, a narrow regex still catches the rehearsed 18-month versus 12-month contradiction.
- Several contacts and phone numbers are hardcoded to controlled demo recipients.
- The action module says some real Gmail/Calendar/Browser behavior was initially faked, with the visible card acting as the demo beat. The repository also contains real AgentMail, AgentPhone, Google Calendar, and Drive adapters, but they can fall back to stubs or simulated call state when credentials are missing.
- Static seeded facts remain as a fallback when live memory services are unavailable.

### Demo structure

The documented beats are: resolve the counterparty, surface a remembered contradiction, recognize the user's promise to send a document, prepare an email, place a side call, and flush queued actions at hang-up. Silence on irrelevant speech is deliberately part of the demonstration.

### Why it likely won

Chief has a distinctive interaction model, a hard engineering constraint judges can feel (latency), visible judgment rather than constant chatter, and credible safety boundaries. The app demonstrates both knowing when to act and when not to act.

### Reusable lesson for Naïve

Autonomy is more credible when restraint is visible. Give the company explicit “do nothing,” approval, and escalation paths and show at least one in the demo.

## 5. Support AGI

### Architecture verified in the repository

Support AGI routes each customer ticket into one of three tiers:

- **Explored:** Claude solves a new request using a GBrain knowledge base and 22 shop tools.
- **Recalled:** a River-trained router identifies the request type and Claude replays a Memorable-extracted procedure with a restricted tool set.
- **Compiled:** a promoted JSON plan runs deterministic bindings, tools, guards, and reply templates with no agent-model call.

A path is eligible for reuse only above a confidence threshold and only for a single-request ticket. After a path succeeds three times, it runs in shadow beside the agent and is promoted after two agreements in three trials. Source: [Support AGI repository](https://github.com/ToukoUrsin/own-your-intelligence-hack).

### Quantified proof present in the repository

- Cost per ticket fell from $0.139 for the first 25 tickets to $0.047 for the last 25, a claimed 66% reduction.
- Time fell from 13.6 seconds to 6.2 seconds.
- The final 25 tickets were 88% recalled and 12% compiled.
- The library learned 52 paths and reused them 325 times.
- The River router reached 77% label accuracy on 100 held-out tickets, versus 64–66% reported for Haiku.
- Sixty of 400 tickets were answered by compiled paths with zero agent-model calls.

### Strong honesty and evaluation practices

The repository distinguishes real components from simulation: model/API calls and the Shopify dev store are real, but the 442-ticket replay uses a local mock shop; the ABCD conversations are role-played data; 27 hard tickets are constructed; there are no real customers or payments; and the compiled-plan evaluation uses a Haiku judge. Raw result files and limitations are committed.

The team also reports weaknesses: exact action-set matching is low across every tier, 24% of hard tickets still reuse the wrong procedure under the gate, and the 94% compiled-plan agreement number is from an offline same-ticket evaluation rather than an independent production set.

### Demo structure verified from `video/SCRIPT.md`

The two-minute script uses no slides:

1. Ticket A is explored and saved as a new path.
2. Shopify admin is refreshed to show a real refund on the development store.
3. Ticket B expresses the same intent differently and recalls the path at lower cost.
4. A familiar refund-status ticket runs as compiled code in about one second with zero model calls.
5. The learning curve shows exploration disappearing and cost falling across 400 tickets.

The script includes preflight checks, exact demo tickets, timing budgets, retake tickets, and a terminal fallback if the UI misbehaves.

### Why it likely won

It tells a strong improvement-over-time story with a visible three-stage transformation, hard numbers, committed evaluation artifacts, and unusually honest caveats. The sponsor products are each assigned one essential role.

### Reusable lesson for Naïve

Do not only show the company doing work. Show the company becoming better at the work, and prove improvement with a before/after graph produced from its own operating history.

## 6. Bake-Off

### Architecture verified in the repository

Bake-Off is a real Next.js/TypeScript application with agent-facing APIs. Supabase provides user authentication; MongoDB stores agents, tasks (“bakes”), acceptances, submissions, comments, and a Brownie Points ledger. OpenRouter refines task specifications, Firecrawl fetches web context, Reducto parses documents, and Resend sends notifications. Agents authenticate using hashed API keys and can create, accept, comment on, submit to, and select winners for bakes. Source: [Bake-Off repository](https://github.com/markmdev/bake-off).

The winner-selection route performs ownership and status checks, prevents self-awards, and uses a MongoDB transaction to atomically mark the winning submission, credit the winner, update statistics, and close the bake. Expired or abandoned tasks refund the creator through scheduled cleanup logic.

### What the implementation does and does not prove

- The competition lifecycle is implemented, including GitHub, pull-request, deployed-URL, ZIP, and plaintext submissions.
- The platform is agent-first: a published `SKILL.md` documents the entire API workflow for an agent to register and participate.
- “Payment” is Brownie Points, an internal virtual currency granted at registration. No real-money payment rail, escrow, or autonomous revenue was found in the audited code.
- Winner selection is done by the task-creating agent through an API call. The repository does not contain an objective output evaluator or dispute system.
- No conventional test files were found in the cloned repository.
- The application has fake-bake flags and seed/demo data controls, but public queries explicitly exclude fake bakes.

### Demo evidence

No clearly attributable public hackathon demo was located. The codebase itself is considerably more complete than the short winner description: 157 commits were visible, and the platform includes public bake pages, agent profiles, a leaderboard, API docs, rate limits, transactions, and cleanup jobs.

### Why it likely won

The concept is instantly memorable, exposes agents as economic actors, and turns output quality into a side-by-side competition rather than a benchmark claim. It also aligns directly with the event sponsors: Firecrawl, Reducto, and Resend are necessary steps in the task lifecycle.

### Reusable lesson for Naïve

A company becomes much more legible when its agents interact through a market, queue, or board that judges can watch. However, for Naïve, replace virtual points with a real business outcome or clearly label the points as simulation.

## 7. ReadyLead

### Public evidence

ReadyLead's official product page says it ingests customer signals, scores intent, prioritizes leads, and produces outreach recommendations. The team says the hackathon version used government open data to find maintenance signals indicating HVAC repair opportunities, enriched building-owner information, and used a Vapi voice agent to pitch the opportunity to contractors. Reported stack: Next.js, Convex, Leaflet, AI scoring pipelines, public-data ingestion, and Vapi. Sources: [official ReadyLead page](https://www.nara-labs.com/projects/readylead) and [team description](https://www.linkedin.com/in/jiajunh).

The official page explicitly says the GitHub repository is “coming soon.” A YouTube demo link is public but was not independently watched in this audit.

### What can be concluded

- **Workflow:** signal detection → opportunity scoring → owner enrichment → map/prioritization → voice outreach.
- **External action:** The team claims the voice agent pitches leads; public sources do not establish whether live calls connected to real contractors or were staged.
- **Guardrails/evaluation:** No public technical source describes opt-out handling, calling consent, lead-quality evaluation, retries, or human approval.
- **Proof:** The strongest evidence is workflow completeness and specialization in commercial HVAC. No conversion, reply, meeting, or revenue metric was located.
- **Likely winning signal:** It does not stop at a lead score. It connects the signal to outbound action for one sharply defined buyer.

### Reusable lesson for Naïve

Every analytics agent should end in an action agent. “We found the lead” is weaker than “we found, qualified, contacted, and logged the lead.”

## Comparative assessment

| Project | Autonomy evidence | External-world proof | Evaluation/metrics | Guardrails visible | Main limitation |
|---|---|---|---|---|---|
| Manceps | Claimed end-to-end dispatch | Unverifiable publicly | None public | None public | No code/demo artifact |
| Gavel | Strong organizer-described loop | Listing, buyer chat, negotiation, pickup | None public | Unknown | Repo private/deleted; demo not independently watched |
| JailCall | Strong two-call workflow | Real phone and email path, though many corpus addresses are placeholders | Detailed traces, no conventional tests found | HMAC, bounded loop, server-side IDs, re-dispatch block | Single-caller demo with forced happy-path firm |
| Chief | Strong real-time decision/action architecture | Real adapters exist; can fall back to cards/stubs/simulation | 161 static test functions and decoy regression cases | Approval hierarchy, speaker identity, timeout-to-silence | Heavily staged contacts and a narrow demo regex fallback |
| Support AGI | Strong learning/reuse loop | Real Shopify dev-store actions; no real customers/payments | Best-in-class committed metrics and caveats | Confidence gate, shadow promotion, fallback to full agent | Replay uses mock shop; hard-ticket misrouting remains high |
| Bake-Off | Real agent marketplace lifecycle | Internal API and artifacts; virtual BP only | No conventional test suite found | Auth, rate limits, atomic winner transaction, refunds | Human/creator judgment, no real payment or objective evaluator |
| ReadyLead | Plausible end-to-end GTM loop | Voice outreach claimed but not independently verified | No public outcome metrics | None public | No repository; demo not independently watched |

## What the strongest winners actually did differently

1. **They made invisible agent work visible.** JailCall has a live tool dashboard, Chief has the orb and action cards, Support AGI has a route panel and learning curve, and Bake-Off has a public market/leaderboard.
2. **They designed a state change the audience could witness.** A reply arrives between JailCall's two calls; a repeated ticket gets cheaper in Support AGI; a promise becomes an action card in Chief; a task moves from open to awarded in Bake-Off.
3. **They created deterministic boundaries around model judgment.** Server-side IDs, hard re-dispatch guards, approval states, confidence gates, shadow promotion, and transactional ledger updates are more credible than prompts alone.
4. **They prepared the demo as a product surface.** Support AGI's script has exact tickets, timing budgets, retake data, fallbacks, and a visible external system. Chief and JailCall also include deterministic safety nets for the critical beat.
5. **The best technical proof was honest about simulation.** Support AGI explicitly separates real APIs, development-store operations, role-played data, local mocks, and model-judged metrics. That makes the claims more credible, not less.

## Direct implications for the Naïve entry

- Build one closed company loop with a beginning and an externally visible completion receipt.
- Make the operations board a judge-facing product: decisions, tool calls, costs, state changes, retries, and human interventions should be visible without opening logs.
- Demonstrate at least two operating cycles so the second can prove memory, learning, or non-duplication.
- Use server-side constraints for budgets, customer identity, approvals, idempotency, and allowed actions. Do not rely on the prompt alone.
- Reserve one demo beat for recovery or restraint. A company that knows when not to act looks more autonomous than one that blindly calls every tool.
- Produce a hard before/after number from the event itself: time-to-delivery, cost per completed job, conversion, gross margin, tool calls, or intervention count.
- Maintain a written “real versus simulated” ledger. Real external actions are ideal, but transparent simulation is better than implying reality.
- Rehearse a golden path and prepare deterministic fallbacks, while keeping them narrow and disclosed in the technical appendix.

