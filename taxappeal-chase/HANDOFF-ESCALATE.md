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

When a reply contains the county's decision, Chase writes three comments, in this order:

```
decision-letter · case <case_id> · level <filing level> · received <YYYY-MM-DD> · <messageId>
<the full text of the county's message, unedited>
```
```
decision: <granted|denied|partial|dismissed> · value <new just value, or none> · <decision date> · <messageId>
```
```
escalate
```

The `decision-letter` comment is the full letter (one per messageId; a PDF's text when it can be
extracted, otherwise `attachment: <filename> (text not extracted)` after the body). Escalate acts only
on cards that carry one; `case` and `level` are copied from the card as written, `case unknown` /
`level unknown` when the card does not say.

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

## What Escalate writes back, and what the tracker shows

Escalate acts only on cards that carry a `decision-letter` comment. It records its outcome on the
**same Waiting-on card**, and the site's board mirror (`taxappeal-site-sync/mirror_board.py`,
`sync.py: stage()`) turns the card into the owner's tracker step from the card's own fields:

| Escalate's outcome | What it does to the card | Tracker step |
|---|---|---|
| won | status `done`, note starts with `WON · ` | `won` |
| closed | status `done`, note starts with `STOPPED · ` | `stopped` |
| appealing again | status `blocked`, note starts with `APPEAL · ` | `appeal` |
| waiting (hearing scheduled, letter unclear or unreadable) | card left as is, plus an `escalate-result` comment (below) | `waiting` |

When Escalate decides to wait, it posts a comment whose first line is one of

```
escalate-result · PENDING · <code> · <messageId>
escalate-result · INCOMPLETE · <code> · <messageId>
```

(the PENDING comment's second line ends in `check again <YYYY-MM-DD>`). Chase then treats the card
as open again: new replies are attached, a new decision gets `decision-letter` + `decision:` +
`escalate` again, follow-ups resume on the card's cadence (none before the `check again` date on a
PENDING card), and the three-follow-up cap restarts, counting only `chased:` comments after the
latest `escalate-result` comment.

When a case must be refiled, Escalate creates one card for Evidence: title
`Evidence · <address> · <case_id>`, assignee `evidence`, status `todo`; body `From Escalate: <code> ·
<level name> (<form>) by <deadline>`, one `fix: <item> (<why>)` line per missing item,
`petition_deadline: <YYYY-MM-DD>`, then the case's original ```json block copied from the Waiting-on
card. Assigning it is what starts Evidence.

## Where everything else is

| Thing | Where |
|---|---|
| The case's numbers (county value, our requested value, comps) | Evidence's `packet.json`, org file id quoted on the `File ·` card and on the `Waiting on` card body |
| Filing receipt, petition number, hearing date | File's note on the `Waiting on` card body (File owns those lines) |
| Follow-ups sent and when | `chased: <date>` comments (max three, then `escalate`) |
| Owner conversation | the `Sign up · <address>` card (status `blocked`) and its comments |
| Owner-facing status page | `cases` table → https://claimos-site-mds8vwd4myby.vercel.app/track |
