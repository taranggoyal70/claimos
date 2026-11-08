# Claim OS — status (Francesco's desks), 2026-11-08 ~05:00 UTC

Naïve Autonomous Company Hackathon, YC. Org **Claim OS** (`org_8wx53w072ee4f1mds8vwd4myby`). Branches: `signup-step`
(PR #5: outreach, site, site-sync, chase) and `evidence-step` (PR #4: Evidence). `main` auto-deploys to Vercel, so nothing is merged yet.

## Live

| What | Where |
|---|---|
| Public site | https://claimos-site-mds8vwd4myby.vercel.app (Naïve app `claimos-site` = `app_nkhc92xe21cyzfd5qakpkcj4g4`, Vercel + Neon Postgres) |
| Owner dashboard (mock account francesco.rosciano@me.com, 5 properties) | `/portal` via a signed link. Today only the `/track` email (24 h) issues one; `taxappeal-site/scripts/demo-link.sh` (14-day link) and the document download links wait on open item 7 |
| Company inbox | `claimos@agentmail.to` (AgentMail; Francesco's account) |
| Board | the CEO's company board, `naive board show agt_84kdvn48drb35vhrpnzd71ex21 --status <todo|doing|blocked|done>` |
| Database | `naive db query --app app_nkhc92xe21cyzfd5qakpkcj4g4 "<sql>"`; tables `candidates` (2,969), `cases` (1,984), `signups` |

## Agents (all in the Claim OS org)

| Agent | Id / version | Starts when | Does | Schedule |
|---|---|---|---|---|
| `signup` | `agt_69tr31n7bdmpqxdfcyakssds08` v17 | hourly cron | answers owners who wrote to `claimos@`, one `Sign up ·` card per owner (status `blocked`), one follow-up after 3 days; three AgentMail MCP tools, no phone | `dep_9b17gg2k1sqr8z315tjqc0478p`, `0 * * * *` ET, **enabled**, $1/pass |
| `outreach` | `agt_3p667wrftahsnk4sdq5js15aaq` v1 | a card assigned to it | county questions by email then Monid phone; call-backs to owners who asked; answer on the card | none (assignment is the wake) |
| `chase` | `agt_ae8ke0z5s3z5rfhw81xcnajzph` v8 | daily cron | follow-ups on `Waiting on …` cards with a `follow_up:` line; full county letters as `decision-letter` comments, `decision:` + `escalate`; re-opens on Escalate's `escalate-result · PENDING/INCOMPLETE` | `dep_3jhj1wpqdzmst03vss1hd5j39j`, `30 9 * * *` ET, **paused**, $1/pass |
| `evidence` | `agt_2rn8zx8963y3r54z8gx5mh0bk9` v7 | a case card assigned to it | re-screens the county with Find's code in its sandbox, builds the packet with `taxevidence`, publishes packet.json/html, creates the `File ·` hand-off card for File; handles Escalate's refile cards (`petition_deadline:`, `fix:` lines carried to File) | none |
| `site-sync` | `agt_ppt06qntqbrzpfjzntrktbk0fd` v10 | 6-hourly cron | imports each new Find run into `candidates` (idempotent) | `dep_kbcbm4c8h18mxpgx73s8gzwx7p`, `40 */6 * * *` ET, **enabled**, $1/pass |
| board mirror | `python3 taxappeal-site-sync/mirror_board.py` on a laptop/Mac mini | by hand or launchd | mirrors every case card into `cases` (stage from title prefix, status, Qualify's note, Escalate's WON/APPEAL/STOPPED, Collect's INVOICE/PAID) | not scheduled yet |

Teammates' agents on the same board: `find` (Nick, 6-hourly), `qualify` (Smaran), `File` and `coordinator` (Tarang), `escalate` and `collect`, `CEO` (board owner; its digest sessions cost ~$0.08 per card change).

## Proven with real actions (2026-11-08)

- Find → **Evidence** → **File**: card `crd_wskrrg2yp3hxqsn23fjx8psd3c` (7969 1st Pl, Hendry) → packet `fil_1hkfp3f5xck5625vfsbyjwk5j2` (ready, 5 comps, county $669,625 → requested $522,000) → File card `crd_xf7pare0t8kctg0w26d0j0t0hj` → Tarang's File agent produced an unsigned DR-486 draft and blocked on the missing POA. Evidence run: $0.007.
- **signup**: fake owner mails answered (41 Palm Grove Ct, Sam), threaded replies with the private-company line and no fee number, cards in `blocked`, no re-reply on the next pass.
- **outreach**: county-question card → email to the "office" → reply → answer on the card → `done` ($0.04).
- **chase**: follow-up email delivered, `chased:` comment, nothing on the not-due pass; a `decision-letter` run was deliberately not done against mail (Smaran's instruction); samples are in the hand-off doc.
- **site**: all 9 pages at 1280 and 375, check flow (real address, condo unit picker, unknown address with illustrative numbers), sign-up row, track-my-claim email link.
- **site-sync**: Find-run import idempotent; the board mirror upserted 250 cases (stages: find 1,846 · qualify 88 · stopped 46 · file 2 · waiting 1 · signup 1).

## Rules the platform enforces (design around them)

- Once a session has read someone's mail, **every send, board write and MCP call stops for a human approval**, even at `allow`. A signup pass with new mail parks twice (card, reply) until someone approves in the Naïve dashboard; idle passes end on their own (~$0.002). `scratchpad/approve.sh <ses>` drives a parked session from a laptop.
- **Assigning a card wakes the assignee** and the platform's card brief tells it to claim the card. `chase` and `signup` refuse card-driven starts for anything but their own flow; never assign cards to `chase`.
- AgentMail's forwarded copies are held by Naïve as `auto_reply`, so forwarding cannot wake agents; the cron stays. Webhook-driven wake is possible but needs a Naïve key on the app.
- Secrets: AgentMail and Monid bearers in vault `vlt_dnpg5ne60hdefpq65t9hbrvjrn`, injected per MCP URL; `AGENTMAIL_API_KEY` on the app as a write-only secret; local copies only in `taxappeal-outreach/.env` (git-ignored). Nothing in prompts or code.

## Hand-offs between desks

- Owner conversation: `Sign up · <address>` card (blocked). A person assigns it to `evidence` once the owner confirmed.
- Evidence → File: `File · <address> · <case_id>` card assigned to `File`, body = packet ids + the case JSON.
- Filed: File writes `Waiting on county · <address> · <case_id>` with `follow_up: <office> <email>, every <N> days, last chased never`.
- Chase → Escalate: `decision-letter · case … · level … · received … · <messageId>` (full letter) + `decision:` + `escalate`; Escalate answers with card notes (`WON · `, `APPEAL · `, `STOPPED · `) or `escalate-result · PENDING|INCOMPLETE …`.
- Escalate → Evidence (refile): `Evidence · <address> · <case_id>` with `fix:` lines and `petition_deadline:`.
- Escalate → Collect: `Collect · <address> · <case_id>`; notes `INVOICE · ` / `PAID · ` → tracker `won` with status `invoice` / `paid`.
- Planned: `authorization: case_id <id> · scope vab_petition · fee <…|none> · partial_above <$|none> · reopen_risk <yes|no>` written on the case card by the board mirror from the site's sign-up/authorization choices.

Details: `taxappeal-chase/HANDOFF-ESCALATE.md`, each folder's README.

## Before the demo (a person at the laptop; the permission classifier denies agents the seed)

```bash
cd taxappeal-site && naive db query --app app_nkhc92xe21cyzfd5qakpkcj4g4 "$(cat db/seed_francesco.sql)"
```
Its last statement prints the five demo stages; they must be evidence, signup, stopped, waiting, won (one each).
The board mirror skips rows whose `owner_email` is set since 2026-11-08, when a pass had reset three of them.

Also human-run (the classifier denies agents `naive app deploy` and `naive db migrate` as production deploys): the
claim-code build of the site (commit dc32aeb and later; the live site still runs the 09:15Z build) and its ledger row.

```bash
naive app deploy app_nkhc92xe21cyzfd5qakpkcj4g4 taxappeal-site   # poll `naive app deployments app_nkhc92xe21cyzfd5qakpkcj4g4` until the newest is ready
cd taxappeal-site && naive db migrate db/migrations/003_claim_codes.sql --app app_nkhc92xe21cyzfd5qakpkcj4g4   # claim_codes already exists; this only records 003 in vetta_migrations
```
Check: `/check` shows the "Have a letter from us?" code field and `/api/verdict?code=BADCODE1` returns `{"found":false,"bad_code":true}`
(the old handler returns `{"found":false}` only).

## Open items

1. Dashboard: label won cases "Invoice sent" / "Paid" from `cases.status`; collect the two authorization choices on the site and write the `authorization:` line (queued behind the portal build).
2. Board mirror on a schedule (Mac mini launchd) instead of by hand.
3. Remove the now-useless AgentMail forward to `signup@claim-os-d4myby.usenaive.ai` (one AgentMail call, must run as Francesco).
4. `claim-os-d4myby.usenaive.ai` requested as a site domain; Naïve hasn't connected its HTTP track yet.
5. Lee County has not been run by Find; the demo data is Hendry + Bay.
6. Fee percentage not fixed by the team; the site and emails quote none.
7. `TRACK_SECRET` and `NAIVE_API_KEY` are not on app `claimos-site` (the laptop's permission policy denies agents every secret-store write; three attempts on 2026-11-08). Francesco runs `sh taxappeal-site/scripts/set-secrets.sh` once, then `naive app deploy app_nkhc92xe21cyzfd5qakpkcj4g4 taxappeal-site`. Until then `/portal` opens through the `/track` email, which works (AGENTMAIL_API_KEY is on the app; live check 2026-11-08: `/track`, `/portal` 200, bad tokens 401, 2 sign-ups + 5 cases seeded).

## Owner dashboard (added 2026-11-08 ~08:15 UTC)

Built and verified: `/portal` (overview with savings totals and chips), `/portal/property` (8-step tracker,
values, deadlines, what we need from you, history, documents, messages), `/portal/messages`, `/portal/book`,
`/portal/account`; `taxappeal-site/WIREFRAMES-PORTAL.md` has the wireframes, `db/migrations/002_portal.sql`
+ `db/seed_francesco.sql` the mock account francesco.rosciano@me.com with five properties (4220 NW 13th St
waiting on the county · 7969 1st Pl at evidence with the real packet and DR-486 draft · 520 Richard Jackson
Blvd unit 1203 at sign-up · 2002 Anchor Ln won · 9014 E Mac Ct stopped). The board mirror never overwrites a
case that has an `owner_email` (sync.py guard), so the demo rows survive site-sync.

Demo path today: open `/track`, enter francesco.rosciano@me.com, click the emailed 24-hour link (proven live
08:02 UTC). For a 14-day link and live document downloads, a person runs once:
`cd taxappeal-site && sh scripts/set-secrets.sh && naive app deploy app_nkhc92xe21cyzfd5qakpkcj4g4 .`
(sets `TRACK_SECRET` and a files:read `NAIVE_API_KEY` on the app), then `sh scripts/demo-link.sh` prints the link.
Known: until those secrets are set, documents show "On file. Ask us for a copy." and the demo-link script refuses.
