# Claim OS customer portal — wireframes (2026-11-08)

Five static pages under `public/portal/` (served clean by `vercel.json` as `/portal`, `/portal/property`,
`/portal/messages`, `/portal/book`, `/portal/account`), one shared `public/portal/portal.js` and one small
`public/portal/portal.css`. Everything else is `site.css` as it stands: `.hero.compact`, `.card`, `.stat(.dual)`,
`.figure`, `.stat-sub`, `.badge`, `.tracker`, `.facts`/`.history` (move those two rules out of `track.html` into
`portal.css`), `.pill`, `.btn`, `.field`, `.check`, `.err`, `.form-grid`, `.thanks`, `.grid-2`, `.label`. Inter only.
Same nav and footer as every page (copy `nav.html` / `footer.html` verbatim; `aria-current="page"` on the
"Track my claim" pill while inside the portal). No kicker above any heading; `.label` micro-labels live only inside
cards and data rows. Reading text 12px or more. Every page passes at 1280 and 375, no horizontal scroll, clean console.

Data: `cases` (+ the columns from `db/migrations/002_portal.sql`: unit, city, zip, petition_number, hearing_date,
decided_value, stop_reason, documents, messages) and `meetings`, read by owner email. Demo rows:
`db/seed_francesco.sql` (francesco.rosciano@me.com, five properties).

## 1. Signing in: the emailed link is the session

- The link `/track` emails stays `/track?t=<token>` (`lib/token.ts`, 24 h). `track.html` State B now does
  `location.replace('/portal?t=' + t)` and nothing else: delete `#yours`, `#cases`, `caseCard`, `emptyCard` and the
  page's `<style>` from `track.html`. State A (request a link) stays as is. New: when the URL carries `?expired=1`,
  show the existing line "This link has expired. Request a new one." and focus the email field.
- `/portal?t=…`: `portal.js` stores the token in `sessionStorage.claimos_t`, then `history.replaceState` to `/portal`
  so the token leaves the address bar. Every portal page calls `GET /api/portal?t=<stored token>` on load.
  No token, or a 401 → `location.replace('/track?expired=1')`. Any other failure → the hero `.sub` reads
  "We could not reach our records. Please reload to try again." and the page stays empty.
- Sign out (Account page) clears `sessionStorage.claimos_t` and goes to `/track`.
- Demo path: open `/track`, enter francesco.rosciano@me.com, click the link in the email (AgentMail is live on the app).

## 2. API

`GET /api/portal?t=` (new `api/portal.ts`; same guards as `api/track.ts`: `verify`, lower-cased email, `ilike` +
exact filter, `cache-control: no-store`). Returns
```
{ email,
  cases: [ { case_id, address, unit, city, zip, county, stage, status, county_value, requested_value, decided_value,
             annual_savings, filing_deadline, petition_number, hearing_date, needs_from_owner, stop_reason,
             history: [{date, line}], documents: [{name, kind, at, file_id?, url?}], messages: [{at, from, text}], updated_at } ],
  signups: [ {address, city, zip, created_at, case_id} ],   // as /api/track today, for the empty state
  meetings: [ {id, slot, status, address, case_id, name, notes} ]  // meetings?email=ilike.<email>&order=slot }
```
Cases: `owner_email ilike <email>` or `case_id in (signups' case_ids)`, newest `updated_at` first, `owner_email`
stripped. Documents with a `file_id` and no `url` get a 7-day link minted per request with
`POST https://api.vetta.sh/v1/files/{file_id}/url` (bearer `NAIVE_API_KEY`, set with `naive app secrets`); when the
secret is missing or the call fails the document keeps no `url` and the page shows it as "On file" (below). Never
expose `file_id` to the browser.

`POST /api/portal-book` (new `api/portal-book.ts`) body `{t, name, address, case_id, slot}`: `verify(t)` → 401 on
failure; `name` 1–120 chars, `slot` an ISO timestamp between now and 60 days out, `case_id` either one of the owner's
cases or empty, `address` ≤ 200 chars. Inserts `meetings (email, name, address, case_id, slot, status='requested')` and
returns `201 {id, slot}`. Field errors as `400 {error, field}`. No email is sent (shortcut: the desk sees the row;
add an AgentMail notice to claimos@agentmail.to when a person wants one).

## 3. Shared pieces (`portal.js` / `portal.css`)

- **Tabs** under the hero on every portal page, `.tabs` = a `.pills` row that stays horizontal and scrolls on
  phones (`display:flex; overflow-x:auto; flex-wrap:nowrap; margin-top:24px`; `.tabs .pill { width:auto }`): Overview
  (`/portal`) · Messages (`/portal/messages`) · Book a meeting (`/portal/book`) · Account (`/portal/account`). Active
  tab: `aria-current="page"`, styled `.tabs .pill[aria-current] { background: var(--ink); color: #fff }`.
- **Stage chip** `.badge` from `stage`: find/qualify "Checking" (gray) · signup "Signed up" (amber) · evidence
  "Evidence" (amber) · file "Filing" (amber) · waiting "Waiting on county" (default) · appeal "Second round" (default)
  · won "Won" (green) · stopped "Closed" (gray). `needs_from_owner` present → the chip reads "Needs you" (amber)
  whatever the stage.
- **Next action** line per card (from `needs_from_owner` when set, else by stage): find/qualify "We are checking the
  parcel." · signup "We confirm the parcel and send the agreement." · evidence "We assemble the evidence packet." ·
  file "We file the petition before the county's deadline." · waiting "Nothing to do. The county sets the hearing;
  we attend." · appeal "We decide the second round with you." · won "Our invoice follows the county's corrected
  bill." · stopped "Nothing. You owe nothing."
- **Tracker** `.tracker` with the eight names from `track.html`; `is-current` = `stage`; `stopped` → `.is-closed`,
  no current step, badge "Closed".
- **Numbers**: `money()`, `date()` and `title()` as in `track.html` (title-case the roll's upper-case addresses;
  collapse spaces). Address line = `title(address)` + (`unit` ? `, Unit ${unit}` : '') ; place line =
  `${title(city)} · ${county} County`.
- **Documents row** `.doc`: name 14px; caption `kind` label + `date(at)`; with `url` → the name is a link
  (`target=_blank rel=noopener`) followed by a `.pill` "Open"; without → 12px muted "On file. Ask us for a copy."
- **Message row** `.msg`: `.label` "CLAIM OS" or "YOU" inside the row, `time` 12px muted, text 14px/1.5 max 64ch;
  owner rows carry `.msg.me` (surface background). Oldest first.
- **Empty account** (signups but no cases): one `.card.step`: h3 "Nothing yet." p "We have your sign-up for
  {address}{, city}{ zip} and are checking the parcel against the county roll by hand; this page fills in as we
  go." Neither signups nor cases: h3 "Nothing under this email yet." p "We have no sign-up or case for {email}. If
  you used a different email, request a new link with it." + `.pill` "Request a new link" → `/track`.

## 4. Pages

### `/portal` Overview — `portal/index.html`, title "Your properties — Claim OS"
1. Nav (Track my claim pill current).
2. `.hero.compact`: h1 "Your properties" · `.sub` "Signed in as francesco.rosciano@me.com." · tabs (Overview current).
3. **Totals** `.card.stat.dual` (max-width 760): LEFT `.label` "Savings identified" · `.figure` "$4,875 <small>/ yr</small>"
   = sum of `annual_savings` over cases with `stage ≠ stopped` · `.stat-sub` "Across 4 of your 5 properties. Estimates;
   the county decides." RIGHT `.label` "Won so far" · `.figure` "$1,053 <small>/ yr</small>" = sum over `stage = won`
   (or "$0" with sub "Nothing decided yet.") · `.stat-sub` "2002 Anchor Ln, decided Nov 3, 2026".
4. **We need something from you** `.card` with `.need` background, hidden when no case has `needs_from_owner`:
   h2 22px "We need something from you". One row per case: strong address line · 14px the `needs_from_owner`
   text · actions as pills: when a document of kind `dr486poa` without a signed twin exists → "Open the DR-486POA"
   (its `url`) and "Send the signed copy" (`mailto:claimos@agentmail.to?subject=Signed DR-486POA · {address} · {case_id}`);
   otherwise "Send it by email" (`mailto:…?subject={address} · {case_id}`); always "Open property" → `/portal/property?id=`.
   Seed: 7969 1st Pl (sign the DR-486POA) and 520 Richard Jackson Blvd, Unit 1203 (owner of record + TRIM notice).
5. **Properties** h2 "Properties" + `.grid.grid-2` of `.card.step` cards, one per case, order: needs you first, then
   active by `updated_at`, won, stopped last. Card: row [h3 address line · `.badge` chip] · `.caption` place line ·
   `.facts` three cells `.label` "County's value" / "Our value" / "Est. saving" with `dd` money (won: "Decided value"
   = `decided_value`, "Saving" = `annual_savings`; stopped: "Our value" "—", "Est. saving" "$0") · 14px next action
   line · `.pill` "Open" → `/portal/property?id={encodeURIComponent(case_id)}`.
6. **Coming up** `.card.step` listing dated items within the next 120 days, soonest first, hidden when none:
   "Nov 12, 2026 · 3:00 PM ET — Call with a licensed tax professional about 7969 1st Pl" (meetings, `status ≠ cancelled`)
   · "Jan 14, 2027 — Hearing before a special magistrate, 4220 NW 13th St (Lee County VAB)" (`hearing_date` ≥ today).
   Each with a `.pill` → the property or `/portal/book`.
7. Footer.
Mobile: hero → tabs (scroll) → totals stacked → needs → property cards 1 column → coming up → footer.

### `/portal/property?id=` Property detail — `portal/property.html`, title "{address} — Claim OS"
Case = `cases.find(c => c.case_id === id)`; none → h1 "We can't find that property." + `.pill` "Back to your properties".
1. Nav. 2. `.hero.compact`: `.pill` "← Your properties" (`/portal`) above · h1 = address line (36px) ·
   `.sub` = "{place line} · Case {case_id}" · `.badge` chip beside the h1 · tabs (none current).
3. One `.card.case` (ruled sections, as `/track` had; max-width 760):
   a. **Tracker** `.tracker` (8 steps, current = stage; stopped = closed).
   b. **Values** `.stat.dual`: LEFT `.label` "County's value" `.figure` money(county_value) `.stat-sub` "From the
      {county} County roll"; RIGHT `.label` "Our value" `.figure` money(requested_value) `.stat-sub` "{money(diff)}
      below the county · est. saving {money(annual_savings)} / yr". Won: RIGHT label "Decided value",
      figure money(decided_value), sub "Lowered by {money(county_value − decided_value)} · {money(annual_savings)} / yr".
      Stopped: RIGHT figure "—", sub "No value requested".
   c. **Facts** `dl.facts` four cells: "Filing deadline" → date, or when null: stage < file "Set when the county
      mails the TRIM notice (August)"; "Hearing" → date(hearing_date) + " · special magistrate", or "Not set yet",
      or won "Held {date}"; "Petition number" → petition_number or "Not filed yet"; "Tax year" → "2026" (from the
      case_id's third field).
   d. **What we need from you** (`.need` cell spanning the row): `needs_from_owner` text + the same action pills as
      the overview; otherwise "Nothing right now." Stopped: heading becomes "Why we stopped" with `stop_reason`,
      then 13px "No fee, nothing filed. We check again when the next roll posts."
   e. **Documents** `.label` "Documents" + `.doc` rows (newest first); none → "Nothing yet."
   f. **History** `.label` "History" + the `.history` list (date · line, newest first).
   g. **Messages** `.label` "Messages" + the last three `.msg` rows (oldest first) + pills "All messages" →
      `/portal/messages#{index}` and "Reply by email" (`mailto:claimos@agentmail.to?subject=Re: {address} · {case_id}`).
4. Footer. Mobile: tracker vertical; dual stacks; facts 1 column; everything else as is.
Seed check: 7969 1st Pl shows the three real files (packet.html, packet.json, DRAFT-DR-486.pdf) as links once
`NAIVE_API_KEY` is set, 2002 Anchor Ln shows "Decided value $128,800 · Lowered by $70,226", 9014 E Mac Ct shows
"Why we stopped".

### `/portal/messages` Messages — `portal/messages.html`, title "Messages — Claim OS"
1. Nav. 2. `.hero.compact`: h1 "Messages" · `.sub` "Every email we exchanged, by property. Reply from your own
   inbox; we read claimos@agentmail.to." · tabs (Messages current).
3. One `.card.case` per case with messages, id `#{index}`, order as the overview: head [h3 address line ·
   `.caption` "{n} messages · last {date}"] → thread of `.msg` rows (all, oldest first) → foot row `.pill`
   "Reply by email" (`mailto:` as above) · `.pill` "Open property". Cases without messages are left out; none at all →
   `.card.step` "No messages yet. We write from claimos@agentmail.to; add it to your contacts."
4. Footer. Mobile: same, one column.

### `/portal/book` Book a meeting — `portal/book.html`, title "Book a meeting — Claim OS"
1. Nav. 2. `.hero.compact`: h1 "Talk to a licensed tax professional" · `.sub` "A 20-minute call, no cost. We go
   through your numbers and what the county will ask." · tabs (Book a meeting current).
3. **Already booked** `.card.step`, shown when a meeting with `slot ≥ now` and `status ≠ cancelled` exists:
   h3 "You have a call on Thu, Nov 12, 2026 at 3:00 PM ET" · p "About 7969 1st Pl, Wheeler. Confirmed. To move it,
   reply to our email." · `.pill` "Book another".
4. **Form** `.card.form-card` `#book` (hidden while 3 is shown until "Book another"): h2 "Book a call" ·
   `.form-grid`: `.field` Name (text, required, prefilled from the latest meeting's `name`) · `.field` Email
   (readonly, the signed-in email) · `.field.full` Property (`<select>`: one option per case, address line; last
   option "A general question") · `.field.full` "Pick a time (Eastern)": a `fieldset` of radio `.check` rows, the next
   five weekdays × 10:00 AM and 3:00 PM, labels like "Mon, Nov 9 · 10:00 AM" (generated client-side, skipping
   weekends; values are ISO strings in America/New_York) · `.err` per field · `.btn` "Book the call" (disabled while
   sending). Errors: "Enter your name." · "Pick a time." · network "We could not book the call. Try again, or email
   claimos@agentmail.to." Under the button, 13px `.caption`: "Claim OS is a private company, not a government
   agency; the call is about your appeal, not legal advice."
5. **Confirmation** replaces the form (`.thanks`, focus to its h2): h2 "Booked." lines: "Thu, Nov 12, 2026 at
   3:00 PM Eastern, about {property}." · "A confirmation comes from claimos@agentmail.to with the call link." ·
   "Have your TRIM notice and any photos of the home to hand." pills "Back to your properties" · "Messages".
6. Footer. Mobile: form 1 column; radio rows full width.

### `/portal/account` Account — `portal/account.html`, title "Account — Claim OS"
1. Nav. 2. `.hero.compact`: h1 "Account" · `.sub` "What we hold about you, and how to leave." · tabs (Account current).
3. `.card.case` sections: **Email** `.label` "Signed-in email" · 15px francesco.rosciano@me.com · 13px "Links to this
   portal go to this address and work for 24 hours." **Properties** `.label` "Properties" · list rows "address line ·
   place line · chip" (5 rows) · `.pill` "Check another address" → `/check`. **Your data** `.label` "Your data" ·
   14px "We store what you typed on the site, the public roll data for each parcel, and the emails we exchanged.
   Nothing is sold or shared." · `.pill` "Delete my data" (`mailto:claimos@agentmail.to?subject=Delete my data ·
   {email}`) · `.pill` "Privacy" → `/privacy`. **Sign out** `.btn.btn-light` "Sign out" (clears the token → `/track`).
4. Footer. Mobile: one column.

## 5. Content rules on every portal page
Private-company line in the footer; no fee number or percentage ("the share set in your agreement"); no promised
outcome ("estimate", "the county decides"); dates are the county's; "Claim OS is not a law firm" where advice is
implied (book page). Only `.label` is 11px. Every `fetch` error has a sentence and a way out; buttons disable while
sending; focus moves to the new heading on state changes; `aria-live="polite"` on the regions that fill from the API.
