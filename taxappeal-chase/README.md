# taxappeal-chase: the Chase desk

One Naïve agent, `chase`, on the shared persona "Claim OS Desk" and inbox `claimos@agentmail.to`.
Daily at 09:30 America/New_York (schedule created paused) it follows up on cases waiting on someone.

```
File (or a person) writes on a card:   follow_up: Lee VAB clerk vab@leeclerk.org, every 5 days, last chased never
chase, each pass ──► blocked + doing cards titled "Waiting on …" ──► due? ──► comment chased: <date> ──► one email
                                                                 └─► reply in the inbox? ──► comment "reply from …"
                                                                 └─► 3 follow-ups sent? ──► comment escalate, stop
```

| Piece | Notes |
|---|---|
| `chase.agent.yaml`, `chase.system.md` | Haiku 5.5, $0.50 a pass, $5 a day; four AgentMail tools, no phone |
| `setup.sh` | finds the persona, creates or updates the agent, attaches the persona, creates the paused schedule |
| Bearer | the AgentMail key sits in the persona's vault, made by `../taxappeal-outreach/setup.sh`; this agent never sees it |

## Setup

```bash
../taxappeal-outreach/setup.sh   # once: persona + vault
./setup.sh
naive deploy resume dep_…        # after one good pass
```

## Giving it work

Any card in `blocked` or `doing` whose title starts with `Waiting on` and whose body has a line
`follow_up: <who> <email>, every <N> days, last chased <date|never>` is chased. The comments are the
state: `chased: <date>` (latest wins, count = follow-ups sent), `reply from <email> on <date> …`,
`escalate` (a person owns it). Max one email per card per pass, three per card ever.

When a reply carries the county's decision, three more comments follow, in this order (the Escalate
desk acts only on cards that have the first one):

```
decision-letter · case <case_id> · level <filing level> · received <YYYY-MM-DD> · <messageId>
<the full text of the county's message, unedited; PDF text if extractable, else
attachment: <filename> (text not extracted)>
```
```
decision: <granted|denied|partial|dismissed> · value <new value or none> · <decision date> · <messageId>
```
```
escalate
```

`case` and `level` come from the card as written (`case unknown` / `level unknown` when absent);
one `decision-letter` per messageId, never reposted.

`shortcut: only titles starting with "Waiting on" are opened (the board list omits bodies); if File
starts writing follow_up: lines on other titles, drop the prefix test in chase.system.md.`

Never assign a card to `chase`: it reads the board on its own. An assigned card wakes a session that
the platform's board guidance tells to claim the card; the prompt forbids claiming, and the tick then
parks the card back to `blocked`.

Naïve holds every send and board write for a person's approval once a session has read mail, so a
pass that chases parks twice (comment, send) until someone approves in the dashboard (or
`approve.sh <ses>`); each resume re-reads the context, about $0.10. A pass with nothing due ends on
its own (about $0.07).

`shortcut: $0.50 a pass covers one chase (two approvals) or several no-op cards; raise max_task_usd
in chase.agent.yaml and --budget-usd in setup.sh when several cards fall due on the same day.`

Tested 2026-11-08: card `crd_sanwvqka9f3jzs1rc9e6ejwngv`, pass `ses_jmdpmf5b0b15ww8hp7dhjz6cf0`
(email delivered, `chased:` comment written), second pass `ses_ga2sda7nfgyecxe82w5fqrw8v3` (nothing due,
nothing sent).
