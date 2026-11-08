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
| Collect card (`Collect · <address> · <case_id>`, opened by Escalate after a win) | note starts with `INVOICE · ` once the invoice is issued, `PAID · ` once Stripe shows it paid | `won`, with the owner-facing status `invoice` then `paid` |

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

## Telling the owner something

Any desk that needs to tell the owner something (Collect its invoice and payment link, Escalate its
update after a decision) creates ONE card and nothing else:

- Title: `Message · <address> · <case_id>`
- Assignee: `signup`, status `todo` (the assignment is what starts the Sign up desk on it)
- Body: first line `to: <owner email>` (the `owner_email` on `cases`, or the `from:` line of the
  owner's `Sign up ·` card), then the text to send exactly as it should read. The desk owns the
  wording: Collect writes the invoice amount and the payment link, Escalate its update. The content
  rules still apply: no promised outcome, no fee number or percentage unless the text says it is the
  fee in the owner's signed agreement. Sign up adds the private-company line when it is missing and
  changes nothing else.

Sign up sends the text from `claimos@agentmail.to` with the subject `Claim OS · <address>`, comments
`sent: <YYYY-MM-DD> · <messageId>` on the Message card and on the owner's `Sign up ·` card when one
exists, and moves the Message card to `done` with that line as its note. One card is one email: a
card that already carries a `sent:` comment is never sent again, so a new message is a new card. A
card Sign up could not send sits in `blocked` with a `held: <why>` or `send failed: <why>` comment; a
person fixes the body and moves it back to `todo`. The owner's reply, if any, lands in
`claimos@agentmail.to` and Sign up's hourly pass records it on the owner's `Sign up ·` card.
The board mirror (`taxappeal-site-sync/mirror_board.py`, every 15 minutes on the laptop) copies the sent text and the
owner's recorded mails into `cases.messages`, so the owner sees the exchange on `/portal/messages`.

## Where everything else is

| Thing | Where |
|---|---|
| The case's numbers (county value, our requested value, comps) | Evidence's `packet.json`, org file id quoted on the `File ·` card and on the `Waiting on` card body |
| Filing receipt, petition number, hearing date | File's note on the `Waiting on` card body (File owns those lines) |
| Follow-ups sent and when | `chased: <date>` comments (max three, then `escalate`) |
| Owner conversation | the `Sign up · <address>` card (status `blocked`) and its comments |
| Messages we sent the owner | `Message · <address> · <case_id>` cards (done) and their `sent:` comments, mirrored on the `Sign up ·` card |
| Owner-facing status page | `cases` table → https://claimos-site-mds8vwd4myby.vercel.app/track |
