# Where the Escalate desk finds the county's decision

For Smaran's Escalate agent (step 7). Everything lives on the **company board** (owner: the CEO
agent, `agt_84kdvn48drb35vhrpnzd71ex21`; every agent in the org is seated on it, so `board_read`
and `board_write` work from any agent without extra setup).

## One card per filed case

When File submits a petition it writes (or a person writes) one card:

- Title: `Waiting on county · <address> · <case_id>`  (the `Waiting on` prefix is the convention)
- Status: `blocked` (waiting on the world; nothing to do until the county answers)
- Body: the case JSON block from Find, the petition/receipt ids File saved, and one line
  `follow_up: <office> <email>, every <N> days, last chased <date or never>`

Chase reads these cards daily, sends follow-ups, and **attaches every answer from that office as a
comment** on the same card. The comments are the record; the body is the brief.

## The decision is a comment on that card

When a reply contains the county's decision, Chase writes two comments, in this order:

```
decision: <granted|denied|partial|dismissed> · value <new just value, or none> · <decision date> · <messageId>
escalate
```

Example:

```
decision: denied · value none · 2027-01-14 · <0100018f…@email.amazonses.com>
escalate
```

- `decision:` is the machine-readable line: outcome, the county's new value if the notice gives one,
  the date on the notice, and the AgentMail `messageId` of the mail it came from.
- `escalate` means a person or the Escalate desk owns the card from now on; Chase stops writing.
- The full notice is in the inbox `claimos@agentmail.to`: `agentmail__get_message` with that
  `messageId` returns the complete text and any attachments (the VAB decision PDF, if attached). If
  the decision arrived on paper, a person adds the same two comments by hand and uploads the scan
  with `publish_file`, quoting the `fil_` id instead of a messageId.

## How Escalate reads it

1. `board_read` with `status` `blocked` (never the unfiltered list: the board holds hundreds of Find
   cards). Keep the cards whose title starts with `Waiting on`.
2. For each, `board_read` by `card_id`; in `comments`, take the **latest** `decision:` line. A card
   with no `decision:` comment has no decision yet; leave it.
3. Parse the four fields split on ` · `. Read the notice with `agentmail__get_message` when the
   text matters (grounds for denial, hearing remarks).
4. Decide the next step (re-hearing request, appeal to circuit court, accept, or stop) and record
   it: comment `escalate: <next step> · <deadline>`, and either create the next step's card
   (`File · …` assigned to `File` for a re-filing) or move this card to `done` with a note. The
   `cases` table in the site database mirrors the card's status through site-sync; a comment
   `stage: appeal` or `stage: won` on the card is picked up on the next sync.

## Where everything else is

| Thing | Where |
|---|---|
| The case's numbers (county value, our requested value, comps) | Evidence's `packet.json`, org file id quoted on the `File ·` card and on the `Waiting on` card body |
| Filing receipt, petition number, hearing date | File's note on the `Waiting on` card body (File owns those lines) |
| Follow-ups sent and when | `chased: <date>` comments (max three, then `escalate`) |
| Owner conversation | the `Sign up · <address>` card (status `blocked`) and its comments |
| Owner-facing status page | `cases` table → https://claimos-site-mds8vwd4myby.vercel.app/track |
