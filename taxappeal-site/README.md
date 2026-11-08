# Claim OS site

## Booking → Briefing

For Tarang (coordinator and deck engine) and Balaji (briefing). The owner portal's "Book a meeting" page books a call on
the presenter's calendar, records it, and asks the coordinator for a briefing. The site never writes a `Briefing ·`
card and never assigns anything to `briefing`: the coordinator builds the deck and writes that card itself.

**Env on the site**

| Name | Value | Without it |
| - | - | - |
| `BOOKING_URL` | The presenter's public calendar link, e.g. `https://cal.com/<user>/<event>` or `https://calendly.com/<user>/<event>` | The page keeps its own time picker (the meeting is `requested`). |
| `PRESENTER_EMAIL` | Who presents the call | `presenter_email: none` on the card. |
| `NAIVE_API_KEY` | A key with `agents:read,agents:write,files:read` | Board signals are skipped and logged; the booking still saves. The files:read-only key 403s. |

`GET /api/booking` → `{url, provider}`: `cal` for cal.com, `calendly` for calendly.com, `link` for any other host
(the picker stays, with an "open our calendar" link), `null` when `BOOKING_URL` is unset or not an http(s) link.

**Flow.** With `cal` or `calendly`, the owner enters a name and picks a property, then books in the calendar's inline embed,
prefilled with name, email and notes (`<address> · case <case_id>`). The embed's booked event (cal.com `bookingSuccessful`
with `uid` and `startTime`; Calendly `calendly.event_scheduled`, which carries no time) posts
`POST /api/portal-action {action: 'book', provider, booking_ref, slot?, name, case_id, address}`. That inserts a
`meetings` row with status `confirmed` and notes `booked via <provider> · <booking_ref>`. Without `booking_ref` the
slot is required and the status is `requested`, as before.

**Board signals** (board `brd_3kb4zft8yttkhm04sv6vn8ydw2`), after the row is saved, fail-soft:

1. A comment on the owner's `Sign up ·` card. The card is the one whose `email:` (website) or `from:` (mail) line is the
   owner's email, preferring the one whose `case_id:` line is this case.
   ```
   call-booked · <ISO slot | time in calendar> · <meeting id> · <address> · <case_id | none> · via portal · booking <BOOKING_URL | none>
   ```
2. One card, only when the meeting names a case: title `Briefing request · <ADDRESS> · <case_id>`, assignee
   `coordinator`, status `todo`, key `briefing-request:<meeting id>`. The body is these lines:
   ```
   case_id: <case_id>
   signup_card: <crd_… | none>
   source: website
   to: <owner email>
   reply_to_message: none
   booking_url: <BOOKING_URL | none>
   presenter_email: <PRESENTER_EMAIL | none>
   requested_slot: <ISO slot | time in calendar>
   deck_version: build
   update_only: no
   ```
   The coordinator builds the deck, then writes the `Briefing · <ADDRESS> · <case_id>` card for `briefing` with the
   same lines plus `present_url` and `pdf_url`, and `deck_version` set to the built version.

**Open points**

- Briefing's step 2 blocks unless `to` equals the Sign up card's `from:` line. Website Sign up cards carry `email:`
  instead, so that check has to accept `email:` too.
- A Calendly booking has no time, so its `slot` is null. The live table still has `slot not null`, so a Calendly booking
  fails to save until a person runs `alter table meetings alter column slot drop not null;`. Cal.com bookings are unaffected.
