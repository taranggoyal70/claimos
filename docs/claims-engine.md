# Shared recovery engine and desk rules

This follows the team's supplied eight-step table. The names below identify current ownership, not extra product agents.

| Step | Owner | Shared responsibility | Property-tax desk supplies |
|---|---|---|---|
| Find | Nick | Ingestion, identity matching, uploads | County sources and over-assessment detection |
| Qualify | Smaran | Rules, LLM review, economics, deadlines | Eligibility and valuation rules |
| Sign up | Unassigned | Outreach, engagement, signature, payment authorization | Authorization and fee terms |
| Evidence | Fra | Checklist, records, requests for missing items | Required exhibits |
| File | Tarang | Form preparation, receipt, response deadline | Destination and filing method |
| Chase | Unassigned | Follow-up scheduling and reply capture | Timing, contacts and channels |
| Escalate | Unassigned | Denial analysis and next-step preparation | Permitted appeal sequence |
| Collect | Unassigned | Outcome verification, invoicing, reconciliation | Fee basis and agreed percentage |

The coordinator sits across the loop. It compares recovery rate and cost between desks and allocates budget. It is not an extra sequential step between Evidence and File.

## What the interface currently proves

- The Qualify package executes rules against synthetic inputs through `/api/qualify`.
- The landing explorer describes the shared-engine/desk-rule boundary using the same stage metadata as the presenter.
- The presenter is an interactive eight-stage simulation with an enforced owner decision at File. Approval continues to follow-up, a sample denial and response, then a sample outcome and invoice. Rejection does not file and cannot advance into Chase.
- Replay time is compressed. The signature, submission, messages, denial, savings verification, invoice and payment shown in stage animations are synthetic artifacts. They are not real external actions.
- The sample success fee is the existing illustrative case's agreed amount, not a fee calculated from a jurisdictional rule. Real billing must take the signed fee agreement as its source.

Connecting the teams' modules requires persistent shared case state, real desk rules, authorized provider integrations, and receipts from actual tool calls. An animated stage is not evidence of that connection.
