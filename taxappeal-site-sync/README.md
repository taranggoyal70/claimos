# taxappeal-site-sync: keeps the website database current

One Naïve agent, `site-sync`, that every 6 hours (a) copies Find's newest published run into the
`candidates` table of the `claimos-site` app and (b) mirrors every company-board card that carries a
case into the `cases` table. The website (another folder) only reads those two tables.

```
Find run (candidates.csv + summary.json, org files) ──► site-sync ──► candidates (upsert by case_id, addr_key)
company board cards (```json block with case_id)    ──►           ──► cases (stage from status/assignee)
```

| Piece | Lives in | Notes |
|---|---|---|
| `site-sync.agent.yaml` | Naïve agent | Haiku 5.5, $0.50 a pass, $5 a day; deny-by-default, `apps` limited to `claimos-site` |
| `site-sync.system.md` | its instructions | the pass in plain steps, five-line report |
| `sync.py` | org file, fetched each pass | CSV / board lines → SQL; needs no secret, the agent runs the SQL through the `apps` tool |
| `setup.sh` | one-time setup | agent, upload sync.py, schedule `40 */6 * * *` America/New_York, created paused |

## Setup

```bash
naive login …            # the Claim OS org
./setup.sh               # prints the agent id, file id, schedule id and a one-pass test command
naive deploy resume dep_…
```

## How it stays cheap and idempotent

- The sandbox has no API key, so the model relays SQL: `sync.py sql` writes one upsert per 200 rows
  (`insert … on conflict (case_id) do update`) and the agent passes each file's text to `db_query`.
- A run is skipped when its `run_id` is already in `candidates`, or when the county's case-id set
  already matches (Find re-publishes the same county several times a day). A pass that runs out of
  budget resumes from the rows already in (`--skip`).
- `cases` is seeded from `candidates` (tier strong/possible, exactly the cards Find posts) with one
  `insert … on conflict do nothing`, then only the cards that moved (`board_read` filtered by
  `doing`, `blocked`, `done`) are read and upserted with the card's own `updated_at`. Stage:
  blocked → stopped, done → file, assigned to evidence → evidence, assigned to file → file, else find.
  Reason: `board_read` lists at most 100 cards, cannot page, and returns every body, so the full
  board (180+ cards) cannot be read by the agent.
- `addr_key` = `upper(regexp_replace(trim(address), '\s+', ' ', 'g')) || '|' || coalesce(zip,'')`,
  computed in SQL, so it can never drift from the website's lookup.

## Not done

- A county re-run whose case ids are unchanged but whose values changed is not re-imported
  (shortcut: upgrade when Find starts changing values between runs).
- `find_files` is name-search; if Find renames its outputs the prompt's two queries must follow.

## Board mirror (laptop, not the agent)

The agent only imports Find runs now. Mirroring the board into `cases` runs from a machine with the
CLI logged in, because the board holds hundreds of full-bodied cards and an agent's `board_read`
cannot page (it overflowed the model on 2026-11-08):

```bash
python3 taxappeal-site-sync/mirror_board.py     # reads every column with `naive board show`, upserts cases, prints stage counts
```

Stage comes from the card (`sync.py: stage()`): `Waiting on …` → waiting, `Sign up ·` → signup,
`File ·` → file (done → waiting), a done Find card → Qualify's verdict in the note (QUALIFIED →
qualify, REJECTED → stopped, EVIDENCE ready → file); the furthest step wins when cards share a case.
Scheduled by `com.claimos.mirror.plist`: launchd runs it every 15 minutes (`StartInterval` 900, once more at load; a pass
takes ~40 s and launchd never overlaps two) on the machine with the repo and the logged-in CLI, today this laptop (the
paths are absolute; the Mac mini has neither the repo nor `naive`). Install once, log in `~/Library/Logs/claimos.mirror.log`:

```bash
cp taxappeal-site-sync/com.claimos.mirror.plist ~/Library/LaunchAgents/ && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claimos.mirror.plist
launchctl bootout gui/$(id -u)/com.claimos.mirror      # stop it
```

The portal demo seed's rows (`taxappeal-site/db/seed_francesco.sql`, `owner_email` francesco.rosciano@me.com,
`DEMO_OWNER` in sync.py) are hand-written: the upsert skips them and reports the count as `skipped_demo_rows`. On
2026-11-08 a mirror pass had reset three of the five demo rows (won → find, stopped → find, evidence → file) and the
dashboard read "$0 won"; this is why. A real owner's row keeps its `owner_email` (the upsert never sets it) and only
moves forward with the board's stage (`RANK`; stopped is reachable and final), so the tracker moves on after the
sign-up and never slips from "signup" back to "find" while the Find card still sits in todo. A row nobody owns
mirrors the board as is.

The same pass also carries website sign-ups to the board (`mirror_signups`): every consented `signups`
row gets a `Sign up · <address>` card in `blocked` (body: email, address, phone, call_ok, consent,
verdict, case_id, claim_code, source: website, date). The board is the cursor and the row needs no extra
column: a row whose email and date already stand in a website card's body is skipped, and the add itself
carries `--key signup:<row id>`, which the platform makes idempotent (a second add returns the card that
key already made; a card the pass had already read gets no comment). `python3 taxappeal-site-sync/mirror_dryrun.py`
runs the whole pass with every write stubbed and prints what it would add; a healthy repeat ends with
`signups: N consented, 0 new card(s)`. When a new sign-up matched a case, the case's Find card gets the comment
`owner signed up via the website: <email> · <date>` and, as its own comment, the hand-off line the coordinator engine,
Escalate (step 4a) and Collect (step 4c) parse: `authorization: case_id <id> · scope vab_petition · fee none · partial_above none ·
reopen_risk no` (the site collects no fee or appeal choices, so the defaults: accept partial wins, no reopen risk). The case gets
`owner_email` and stage `signup` (only when no owner held it).
The `Sign up` card is then the owner's conversation, like the ones `signup` opens from mail. The owner also hears from us at once:
the same pass adds one `Message · <address> · <case_id>` card (assignee `signup`, status `todo`, `--key message:signup:<row id>`,
body `to: <email>` + signup.system.md's owner script: confirm owner of record and TRIM notice, free check, agreement + DR-486POA
next, private-company line); the signup desk emails it and writes `sent:` on the Message card and the Sign up card
(`taxappeal-chase/HANDOFF-ESCALATE.md`, "Telling the owner something"). The owner's reply lands in `claimos@` and signup's hourly pass takes it from there.
The owner sees the conversation on `/portal/messages`, which reads `cases.messages`: the same pass (`mirror_messages`) appends
every sent `Message ·` card (the body minus its `to:` line, dated by its `sent: <date> · <messageId>` comment, `from: claimos`) and
every owner mail recorded on their `Sign up ·` card (`message_id:` line in the body or a comment; the text comes from the claimos@
inbox through AgentMail's `extracted_text`, key in `taxappeal-outreach/.env`, `from: owner`). Each entry carries the mail id, so a repeat
pass writes nothing (`messages: N on the board, 0 written`); the demo seed's rows are never touched. Not mirrored: the owner-script
replies signup sends by `reply_to_message` (the card records only `replied: <date>`, no id). The card-comment reads add ~1 s per
`Message ·` / `Sign up ·` card to the pass.

## Board mirror in the app (`taxappeal-site/lib/mirror.ts`)

The laptop mirror above is ported to the site: `mirrorRun({dry, only})` in `taxappeal-site/lib/mirror.ts` does the same pass
through the board REST (`lib/naive-board.ts`: pages the whole board with `?after=`, REST has no column filter) and PostgREST.
It is reached as the MCP tool `claimos.mirror_run` (`api/mcp.ts`) or `POST /api/mirror` with the `CLAIMOS_MCP_BEARER` bearer,
body `{"dry": true, "only": ["owner"]}` (dry is the default). Steps, in order: `cases` (sync.py's stage/substatus/rank and the
DEMO_OWNER guard), `signups`, `messages` (a332f84), then three bridges for hand-offs no teammate agent writes:

- `evidence` (a): a `Sign up ·` card with `owner_confirmed: yes` (comment) or `source: website` + `consent: True` whose case's
  Find card is QUALIFIED and unassigned gets `assignee: evidence`, status `todo`, and the comment `evidence-started · <signup card>`.
- `owner` (b, gap #6): every Escalate `owner-update (…): <subject>: <body>` line (in an `escalate-result ·` comment on a
  `Waiting on` card), Collect `owner-message (…)` line (in a `collect-result ·` comment on a `Collect ·` card) and Collect
  `payment-link · <ref> · https://…` comment becomes one `Message · <address> · <case_id>` card (assignee signup, todo, body
  `to: <cases.owner_email or the Sign up card's from:/email:>` + subject, body, private-company line), key `msg:<comment id>`.
  No owner email: skipped. A text already on a Message card of the case (Collect's repeat reminders): skipped.
- `waiting` (c): a `File ·` card whose note or a comment carries a confirmation/receipt number and does not say test, replay,
  held or not filed gets `Waiting on county · <address> · <case_id>` (blocked, key `waiting:<case_id>`, `case_id:`,
  `level: vab_petition`, `petition:`, a `follow_up:` line only when that text names an email, then Find's json block).

A pass takes 10-13 s (board ~7 s, comments only for Message, Sign up, Waiting on, Collect and File cards, 10 in flight).
Dry run 2026-11-08 against the live board and DB: 439 cards, 250 case cards; cases 247 to upsert with 0 stage changes
(the port matches the Python mirror's last write), 3 demo rows skipped; signups 5 consented, 0 new; messages 5 on the
board, 0 new; (a) 0 to start (the one confirmed, linked case is already `EVIDENCE ready`); (b) 9 owner updates found, all on
`DEMO ·` cards whose cases have no owner email, so 0 cards; (c) 0 (both File cards say nothing was filed).
The app's `NAIVE_API_KEY` needs agents:read and agents:write (today it is files:read only; a person runs `naive keys create --name claimos-site --scopes agents:read,agents:write,files:read` and replaces it).
Shortcut: the cases rank guard is read-then-write, not one SQL statement; a sign-up landing mid-pass can be overwritten once
and the next pass corrects it.

## Letters to owners (laptop, not the agent)

First contact is a paper letter, never a cold email or call. `letters.py` writes one letter per QUALIFIED case
(every board card whose note starts with Qualify's `QUALIFIED`, one per `case_id`) whose owner of record is an
individual or a trust (companies, estates, banks, government and associations are skipped), using the mailing
address from Find's full `candidates.jsonl` in the org file library (the board card only carries the name):

```bash
python3 taxappeal-site-sync/letters.py    # letters/<date>/<code>.html + .pdf, letters/<date>/letters.csv, claim_codes upserted
```

Each letter carries a claim code: 8 characters (A-Z and 2-9, no 0/O/1/I) from `sha256(case_id + TRACK_SECRET)`
(`taxappeal-site/.env`), so re-running gives the same code. `claim_codes(code, case_id, created_at, mailed_at,
used_at)` in the site database (migration `taxappeal-site/db/migrations/003_claim_codes.sql`) maps it back:
`/check?code=…` (or the "Have a letter?" field on /check) shows that property's numbers without an address, and a
sign-up made with the code stores `signups.claim_code` + `case_id` and sets `claim_codes.used_at`.

**People print and mail the letters** (`letters.csv` is the mail merge: name, address lines, property, county
value, our value, savings a year, code), then mark them: `update claim_codes set mailed_at = now() where code in (…)`.
Nothing in this folder posts, emails or calls anyone. The `letters/` folder is git-ignored (owner addresses).
PDFs come from the gstack `browse` binary's headless Chromium; Chrome's own `--print-to-pdf` hangs on this Mac.
