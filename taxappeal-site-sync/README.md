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
Run it after a Find run or a few times a day (a launchd job on the Mac mini is the natural home).

A case with `cases.owner_email` set (the portal demo seed `taxappeal-site/db/seed_francesco.sql` today,
real sign-ups later) is the owner's: the upsert skips it (`where cases.owner_email is null`) and reports
the count as `skipped_owner_rows`. On 2026-11-08 a mirror pass had reset three of the five demo rows
(won → find, stopped → find, evidence → file) and the dashboard read "$0 won"; this is why.

The same pass also carries website sign-ups to the board (`mirror_signups`): every consented `signups`
row gets a `Sign up · <address>` card in `blocked` (body: email, address, phone, call_ok, consent,
verdict, case_id, claim_code, source: website, date). The board is the cursor and the row needs no extra
column: a row whose email and date already stand in a website card's body is skipped, and the add itself
carries `--key signup:<row id>`, which the platform makes idempotent (a second add returns the card that
key already made; a card the pass had already read gets no comment). `python3 taxappeal-site-sync/mirror_dryrun.py`
runs the whole pass with every write stubbed and prints what it would add; a healthy repeat ends with
`signups: N consented, 0 new card(s)`. When a new sign-up matched a case, the case's Find card gets the comment
`owner signed up via the website: <email> · <date>` and `cases.owner_email` is set (only when empty).
The `Sign up` card is then the owner's conversation, like the ones `signup` opens from mail.

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
