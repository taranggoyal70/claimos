# Claim OS — status (Francesco's desks), 2026-11-08 ~05:00 UTC

Naïve Autonomous Company Hackathon, YC. Org **Claim OS** (`org_8wx53w072ee4f1mds8vwd4myby`). Branches: `signup-step`
(PR #5: outreach, site, site-sync, chase) and `evidence-step` (PR #4: Evidence). `main` auto-deploys to Vercel, so nothing is merged yet.

## Live

| What | Where |
|---|---|
| Public site | https://claimos-site-mds8vwd4myby.vercel.app (Naïve app `claimos-site` = `app_nkhc92xe21cyzfd5qakpkcj4g4`, Vercel + Neon Postgres) |
| Owner dashboard (mock account francesco.rosciano@me.com, 5 properties) | `/portal` via a signed link. Today only the `/track` email (24 h) issues one; `taxappeal-site/scripts/demo-link.sh` (14-day link) and the document download links wait on open item 7 |
| Sign-up entry points | `/signup` (nav "Sign up"; emails the case-page link at once), the sign-up card under `/check`, a letter's claim code on `/check` (`?code=`), or an email to the company inbox |
| Company inbox | `claimos@agentmail.to` (AgentMail; Francesco's account) |
| Board | the CEO's company board, `naive board show agt_84kdvn48drb35vhrpnzd71ex21 --status <todo|doing|blocked|done>` |
| Database | `naive db query --app app_nkhc92xe21cyzfd5qakpkcj4g4 "<sql>"`; tables `candidates` (2,969), `cases` (1,984), `signups` |

## Agents (all in the Claim OS org)

| Agent | Id / version | Starts when | Does | Schedule |
|---|---|---|---|---|
| `signup` | `agt_69tr31n7bdmpqxdfcyakssds08` v32 (live cap $10/day, $4/task; repo yaml still 5/2) | hourly cron, or a `Message ·` card assigned to it | answers owners who wrote to `claimos@`, one `Sign up ·` card per owner (status `blocked`), one follow-up after 3 days; emails owners the text of `Message · <address> · <case_id>` cards other desks create (HANDOFF-ESCALATE.md, "Telling the owner something"); four AgentMail MCP tools, no phone | `dep_9b17gg2k1sqr8z315tjqc0478p`, `0 * * * *` ET, **enabled**, $2/pass |
| `outreach` | `agt_3p667wrftahsnk4sdq5js15aaq` v4 | a card assigned to it | county questions by email then Monid phone; call-backs to owners who asked; answer on the card | none (assignment is the wake) |
| `chase` | `agt_ae8ke0z5s3z5rfhw81xcnajzph` v10 | daily cron | follow-ups on `Waiting on …` cards with a `follow_up:` line; full county letters as `decision-letter` comments, `decision:` + `escalate`; re-opens on Escalate's `escalate-result · PENDING/INCOMPLETE` | `dep_3jhj1wpqdzmst03vss1hd5j39j`, `30 9 * * *` ET, **paused**, $1/pass |
| `evidence` | `agt_2rn8zx8963y3r54z8gx5mh0bk9` v10 (v9–v10 by the coordinator's key, 17:05–17:30Z; repo is v8's text) | a case card assigned to it | re-screens the county with Find's code in its sandbox, builds the packet with `taxevidence`, publishes packet.json/html, creates the `File ·` hand-off card for File; handles Escalate's refile cards (`petition_deadline:`, `fix:` lines carried to File) | none |
| `site-sync` | `agt_ppt06qntqbrzpfjzntrktbk0fd` v11 | 6-hourly cron | imports each new Find run into `candidates` (idempotent) | `dep_kbcbm4c8h18mxpgx73s8gzwx7p`, `40 */6 * * *` ET, **enabled**, $1/pass |
| board mirror | `python3 taxappeal-site-sync/mirror_board.py` on a laptop/Mac mini | by hand or launchd | mirrors every case card into `cases` (stage from title prefix, status, Qualify's note, Escalate's WON/APPEAL/STOPPED, Collect's INVOICE/PAID) | `taxappeal-site-sync/com.claimos.mirror.plist` (every 15 min) is in the repo, not loaded yet |

Teammates' agents on the same board: `find` (Nick, 6-hourly), `qualify` (Smaran), `File` and `coordinator` (Tarang), `escalate` and `collect`, `CEO` (board owner; its digest sessions cost ~$0.08 per card change).

## Proven with real actions (2026-11-08)

- Find → **Evidence** → **File**: card `crd_wskrrg2yp3hxqsn23fjx8psd3c` (7969 1st Pl, Hendry) → packet `fil_1hkfp3f5xck5625vfsbyjwk5j2` (ready, 5 comps, county $669,625 → requested $522,000) → File card `crd_xf7pare0t8kctg0w26d0j0t0hj` → Tarang's File agent produced an unsigned DR-486 draft and blocked on the missing POA. Evidence run: $0.007.
- **signup**: fake owner mails answered (41 Palm Grove Ct, Sam), threaded replies with the private-company line and no fee number, cards in `blocked`, no re-reply on the next pass.
- **signup, Message cards** (gap 3): Message card `crd_x775ad8khq3p3ykamz7xf89wx4` (7969 1st Pl, invoice text, `to:` the test inbox) → one email `Claim OS · 7969 1ST PL` delivered 09:30Z (`<010001a1ba7effdb-…@email.amazonses.com>`), `sent:` comment on the Message card and the owner's three `Sign up ·` cards, card `done` (ses_69w0q28sh1dbwhnbghfh55f62g). Second wake on the same card (ses_jdwa85pnhmgt8b8pf3r08bw5ay, 10:33Z): no mail tool called, card back to `done` with the note `already sent`, no new mail in the inbox, $0.007. Note: while a signup pass sits parked for approval, the board refuses the Message card's claim ("you are already on crd_…"); the desk still finishes the card unclaimed.
- **Owner loop** (teammates' three gaps, 2026-11-08 ~10:45 UTC): `letters.py` wrote 91 one-page letters with claim codes for every QUALIFIED Bay case (`claim_codes` 91 rows, codes deterministic, letters git-ignored, nothing mailed); `/check?code=896LLQTR` resolved the case and the sign-up stored `claim_code` (local run of the new api against the live DB; the live site waits on the deploy below); `mirror_board.py` turned the 4 consented website sign-ups into `Sign up ·` cards (second pass 0 new); `/signup` created row `14b8be10…` (7547 18th Pl, Hendry case matched) and the case-page link email arrived 2 s later.
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

- Owner conversation: `Sign up · <address>` card (blocked). Once the owner confirmed, a person assigns the case's **Find card** to `evidence`, never the Sign up card: Evidence reads Find's case from the ```json block that ends the Find card's body, and no Sign up card (mail or website) carries one. The Find card is the one with the `owner signed up via the website` / `claim-link` comment, or whose title carries the Sign up card's address (website cards also name the `case_id`); proven with Find card `crd_wskrrg2yp3hxqsn23fjx8psd3c`.
- Evidence → File: `File · <address> · <case_id>` card assigned to `File`, body = packet ids + the case JSON.
- Filed: File writes `Waiting on county · <address> · <case_id>` with `follow_up: <office> <email>, every <N> days, last chased never`.
- Chase → Escalate: `decision-letter · case … · level … · received … · <messageId>` (full letter) + `decision:` + `escalate`; Escalate answers with card notes (`WON · `, `APPEAL · `, `STOPPED · `) or `escalate-result · PENDING|INCOMPLETE …`.
- Escalate → Evidence (refile): `Evidence · <address> · <case_id>` with `fix:` lines and `petition_deadline:`.
- Escalate → Collect: `Collect · <address> · <case_id>`; notes `INVOICE · ` / `PAID · ` → tracker `won` with status `invoice` / `paid`.
- Sign up → coordinator / Escalate / Collect: `authorization: case_id <id> · scope vab_petition · fee none · partial_above none · reopen_risk no`, a comment on the case's Find card, written by the board mirror (`mirror_signups`) for every consented website sign-up that matched a case (since 2026-11-08; the site collects no fee or appeal choices yet, so the defaults). Mail sign-ups still get no line.

Details: `taxappeal-chase/HANDOFF-ESCALATE.md`, each folder's README.

## Before the demo (a person at the laptop; the permission classifier denies agents the seed)

```bash
cd taxappeal-site && naive db query --app app_nkhc92xe21cyzfd5qakpkcj4g4 "$(cat db/seed_francesco.sql)"
```
Its last statement prints the five demo stages; they must be evidence, signup, stopped, waiting, won (one each).
The board mirror skips only the demo seed's rows (`owner_email` francesco.rosciano@me.com, `DEMO_OWNER` in sync.py) since 2026-11-08, when a pass had reset three of them; a real owner's row only moves forward with the board's stage (`RANK`, stopped final), never back from signup to find while the Find card sits in todo.

Also human-run (the classifier denies agents `naive app deploy` and `naive db migrate` as production deploys): the
claim-code build of the site (commit dc32aeb and later; the live site still runs the 09:15Z build) and its ledger row.

```bash
naive app deploy app_nkhc92xe21cyzfd5qakpkcj4g4 taxappeal-site   # poll `naive app deployments app_nkhc92xe21cyzfd5qakpkcj4g4` until the newest is ready
cd taxappeal-site && naive db migrate db/migrations/003_claim_codes.sql --app app_nkhc92xe21cyzfd5qakpkcj4g4   # claim_codes already exists; this only records 003 in vetta_migrations
```
Check: `/check` shows the "Have a letter from us?" code field and `/api/verdict?code=BADCODE1` returns `{"found":false,"bad_code":true}`
(the old handler returns `{"found":false}` only).

## Open items

1. Dashboard: label won cases "Invoice sent" / "Paid" from `cases.status`; collect the two authorization choices (`partial_above`, `reopen_risk`) on the site; the mirror writes the `authorization:` line with the defaults until then.
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
demo seed's case (sync.py `DEMO_OWNER` guard), so the demo rows survive site-sync.

Demo path today: open `/track`, enter francesco.rosciano@me.com, click the emailed 24-hour link (proven live
08:02 UTC). For a 14-day link and live document downloads, a person runs once:
`cd taxappeal-site && sh scripts/set-secrets.sh && naive app deploy app_nkhc92xe21cyzfd5qakpkcj4g4 .`
(sets `TRACK_SECRET` and a files:read `NAIVE_API_KEY` on the app), then `sh scripts/demo-link.sh` prints the link.
Known: until those secrets are set, documents show "On file. Ask us for a copy." and the demo-link script refuses.

## End-to-end run 2026-11-08

Final audit at ~17:40 UTC, every row re-checked against the live board, database, test inbox (REST) and site, not from the fixers' reports.
Test case: signups row `14b8be10-f77f-4692-80b9-1ad4a89aa712` · case `FL-36-2026-1 28 44 07 A00 0111.0000` (7547 18th Pl, Wheeler, Hendry) ·
Find `crd_7mc54fqe0zm3rtfnzb987zpg12` (done, evidence) · Sign up `crd_vf09vr4ps24s3dbr6ej4tnjqpb` (blocked) · File `crd_q21px2chme8a8n1wdd0hq7rwr0` (blocked, File) ·
Waiting on county `crd_tk66kkx0m81wzr7245krm3tx0n` (hand-written) · Message `crd_3mmjp7bnfd55zvk1fg1590exc0`, `crd_7agzvp0z3ykhx7thex404rjwx5`, `crd_na1amdtercdmvxc4a6b6gmeetn` (done),
`crd_rnc48t3kzc952jw0586z2zwr6h` (held) · packet `fil_m8k9kfsfweskzhveke2fr3zg4a` / `fil_dxy1tgh17avrg742rw8rh5ggx3`. Every test card carries `test case · end-to-end run 2026-11-08`.

| Step | Status | Evidence |
|---|---|---|
| Letters + claim codes | pass | `letters/2026-11-08`: 91 html, 91 pdf, 1 csv; `claim_codes` 91 rows, 0 mailed, 0 used; live `/api/verdict?code=3FJ9AYB2` → `FL-13-2026-12989167000`, `?code=BADCODE1` → `bad_code:true` |
| `/check` | pass | live build `apd_a8hb5tffsgjg33th9ag3bg2sg0` (17:12Z) = repo html; 375px: min font 12px, no horizontal scroll, console clean, private-company line, code field + `?code=` result |
| `/signup` | pass | live 200 "Sign up — Claim OS", 375px clean; row `14b8be10…` created 10:53:40Z by the real form, case-page mail 10:53:42Z (9 × "Your Claim OS case page" in the test inbox) |
| Website sign-up → board | pass | `mirror_board.py`: Sign up card `crd_vf09…` (body `email/address/case_id/source: website`), Find comment `bcm_thhgp73whax3kffz6x8xqc3bs0`, `cases.owner_email` set; dry run now: 437 cards, 0 new. Schedule is a human step (plist not loaded) |
| Inbound owner mail → reply + card | pass | owner mail `<010001a1baeeae30-…>` 11:32:46Z → reply `<010001a1baef9f9d-…>` 11:33:48Z in the test inbox; card comment `bcm_ccebkxwvjzgsfw76v3at0sq99t` (`message_id`, `replied`, `owner_confirmed: yes`); live v32 keeps both prompt fixes (board_write before reply; blocked read before a Message send) |
| `owner_confirmed` → Evidence | partial | coordinator posted only `claim-link` (`bcm_770prt6by1qay5btckmzccnvk0`, 16:57Z, 5 h later) and never assigned; a person assigned the Find card 15:22Z → Evidence `ses_g3ngxapbyv6n2gnn58467z1t8v` $0.008, Find card done, packet published. Find card still has **no** `authorization:` comment (human step below) |
| Evidence → File | teammate | File card created with the ```json block; File v10 (Tarang) holds: `worksheet_only`, "unsigned two-page draft … Manifest says blocked, submitted=false", no file id on the card (`bcm_0rfvsgy24ac7jqyp1tx8hhhp2t`). Hand-off schema `claimos.evidence.result/1` not agreed |
| File → Waiting on | teammate | File wrote no `Waiting on county ·` card; `crd_tk66…` is hand-written (`follow_up:` every 1 day to the test inbox). Only 3 hand-written Waiting-on cards exist on the board |
| Chase follow-up | partial | hand pass `ses_gm89gdrx94hmtxbxb87p48st52` (v10, $0.19) read both Waiting-on cards, sent nothing: Lee TEST not due, Hendry test card "petition never filed" → `crd_tk66…` still 1 comment. Send path proven only on the synthetic Lee card. Deploy `dep_3jhj1wpqdzmst03vss1hd5j39j` now **paused** (enabled false) |
| Chase decision → Escalate | skipped | by instruction (Smaran): no county decision faked by mail |
| Escalate/Collect → Message card → owner email | partial | consumer proven 3×: `Claim OS · 7547 18TH PL, WHEELER` 15:46:45Z + 17:19:59Z, `Claim OS · 7547 18th Pl, Wheeler 33935` 16:29:30Z, all claimos@ → test inbox only; `sent:` mirrored to the Sign up card for 2 of 3 (`bcm_56dq…`, `bcm_wfkh…`), 1 card held on content (`crd_rnc4…`). Producer side: 0 Message cards ever created by `escalate`/`collect` |
| Owner reply recorded | partial | reply `<010001a1bbd914ce-…>` 15:48:48Z is on the Sign up card (`bcm_7eg3ab3mey8emngmt8y0xn84ft`) but not in `cases.messages` (the comment's first `message_id:` is the 11:32 mail) → `/portal/messages` shows 4 messages, not 5 |
| Tracker `/track` | partial | DB + local: `waiting`/`blocked`; live `/api/track` and `/api/portal` say `file`/`prepared` with a `workflow: recorded` block, `history` and `needs_from_owner` that no branch of this repo produces (deploys 16:56–17:12Z, `CLAIMOS_WORKFLOW_READ_KEY`). Bad token: `/api/track` 401, `/api/portal` 200 `{"error":"expired"}` by design |
| Portal | pass | live 375px `/portal/property?id=<test case>&t=<test token>`: "7547 18th Pl — Claim OS", min font 12px, no horizontal scroll, console clean; `/portal/messages` 4 messages (1 owner, 3 Claim OS). `documents` 0 for the test case (packet files not linked) |
| Hourly / 6-hourly schedules | partial | signup `dep_9b17…` fired 06:00, 09:00, 10:00, 11:01, 16:01, 17:01Z (no fire 12–15Z while 11:01 sat parked), spend $5.10 today; site-sync `dep_kbcb…` 05:41 + 11:40Z; Find `dep_1gr3…` now `--counties Bay,Lee,Hendry --include-closed`, next 23:17Z (Lee still 0 candidates); chase paused; board mirror plist not loaded |
| Agent configs in sync | partial | chase v10, site-sync v11 identical to repo; outreach v4 trailing newline only; signup live v32 ≠ repo (13 lines: `send failed` retry step; v31 `usr_svpd…` raised cap to $10/$4, v32 `key_9z79…`); evidence live v10 ≠ repo (5 lines, `assignee` `file` lower-case + "Evidence to File contract" paragraph); live chase/outreach default permission `allow`, repo yaml `ask` |
| Secrets / keys hygiene | pass | `git ls-files`: no `.env` tracked (only `taxappeal-qualify/.env.example`); `git grep` for `am_…`/`sk-…`/`Bearer …`/`*_KEY=` → only the README placeholder and the mirror's regex; history grep clean; `.gitignore` covers `.env*`; nothing printed in this run |

Also seen (not ours): `claimos@` sent "Briefing v1 ready …" to `balajikdev@gmail.com` and "Your property briefing …" to `demo-owner@example.com` at 16:58–16:59Z (`briefing` agent `agt_zfew4arjmjx9r0rz3bwd1y9p0x`, v2) — outside the two allowed inboxes.

Human steps (Francesco, from a logged-in laptop):

```bash
cd ~/Desktop/codes/claimos
# authorization hand-off for the test case (the only consented sign-up older than the mirror change)
naive board comment agt_84kdvn48drb35vhrpnzd71ex21 crd_7mc54fqe0zm3rtfnzb987zpg12 --body "authorization: case_id FL-36-2026-1 28 44 07 A00 0111.0000 · scope vab_petition · fee none · partial_above none · reopen_risk no"
# board mirror every 15 minutes on this laptop
cp taxappeal-site-sync/com.claimos.mirror.plist ~/Library/LaunchAgents/ && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claimos.mirror.plist
# signup: repo yaml (cap 5 / task 2, ask) vs live v32 (10 / 4): pick one, then
cd taxappeal-outreach && naive agent update agt_69tr31n7bdmpqxdfcyakssds08 -f signup.agent.yaml && cd ..
# outreach + chase run live at permission allow (coordinator key, 08:28Z); to restore ask:
cd taxappeal-outreach && naive agent update agt_3p667wrftahsnk4sdq5js15aaq -f outreach.agent.yaml && cd ../taxappeal-chase && naive agent update agt_ae8ke0z5s3z5rfhw81xcnajzph -f chase.agent.yaml && cd ..
# remove the AgentMail forward claimos@ → signup@claim-os-d4myby.usenaive.ai (AgentMail dashboard, account owner)
```

Teammate asks: Tarang — commit the recorded-workflow layer that the live `/api/portal` and `/api/track` serve (deploys 16:56–17:12Z) into `taxappeal-site` on a branch, or the next deploy from this repo drops it; agree the Evidence → File hand-off (`claimos.evidence.result/1` vs `packet.json ready`) and have File write the `Waiting on county ·` card with the `follow_up:` line; evidence v10 says `assignee` `file` — the agent is `File`, confirm the board accepts it. Smaran — Escalate/Collect create `Message · <address> · <case_id>` cards (assignee `signup`, body `to: <owner email>` + text) instead of `owner-update` comments; Collect's note `INVOICE · ` / `PAID · `. Nick — Find's 23:17Z pass is the first with Lee; check Lee candidates land and Qualify picks up schema-2 Hendry cards. Briefing agent owner — no mail to addresses outside the two inboxes before the demo.

Still missing: `authorization:` line on the test Find card (above); owner replies after the first mail are not copied into `cases.messages`; the test case has no `documents` in the portal; File → Waiting-on and Escalate/Collect → Message producers (teammates); chase has never been exercised against a filed petition; Lee County data.
