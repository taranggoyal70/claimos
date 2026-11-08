import { db, fail } from '../lib/lookup';
import { verify } from '../lib/token';
import { ownerData } from '../lib/portal';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (error: string, field: string) => Response.json({ error, field }, { status: 400 });
const DAY = 86400e3;
const BOARD = 'https://api.vetta.sh/v1/boards/brd_3kb4zft8yttkhm04sv6vn8ydw2';

async function board(path: string, body?: object) {
  const r = await fetch(BOARD + path, { method: body ? 'POST' : 'GET', body: body && JSON.stringify(body), headers: {
    authorization: `Bearer ${process.env.NAIVE_API_KEY}`, accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'claimos-site/1.0' } });
  if (!r.ok) throw new Error(`board ${r.status} ${path.split('?')[0]}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
const line = (body: string, k: string) => body.split('\n').find((l) => l.startsWith(k + ':'))?.slice(k.length + 1).trim().toLowerCase();

// The owner's Sign up card names them on its email: (website) or from: (mail) line; the one naming this case wins.
// The REST list has no filter, so this pages the board (about 5 pages today).
async function signupCard(email: string, caseId: string | null) {
  let after = '', first: { id: string } | null = null;
  do {
    const p = await board(`/cards?limit=100${after && '&after=' + after}`);
    for (const k of p.data) {
      const body = k.body ?? '';
      if (!k.title.startsWith('Sign up ·') || ![line(body, 'email'), line(body, 'from')].includes(email)) continue;
      if (caseId && line(body, 'case_id') === caseId.toLowerCase()) return k;
      first ??= k;
    }
    after = p.has_more ? p.next_cursor : '';
  } while (after);
  return first;
}

// Booking → Briefing (README): a call-booked comment on the Sign up card and one Briefing request card for the coordinator,
// which builds the deck and writes the Briefing card itself. Fail-soft: a board error is logged and never undoes the booking.
type Meeting = { id: string; slot: string | null; address: string | null; case_id: string | null };
async function boardSignals(m: Meeting, email: string, roll: string | null) {
  if (!process.env.NAIVE_API_KEY) return console.error('booking board signals skipped: NAIVE_API_KEY unset');
  const url = process.env.BOOKING_URL?.trim() || 'none', when = m.slot ? new Date(m.slot).toISOString() : 'time in calendar';
  const card = await signupCard(email, m.case_id).catch((e) => (console.error('booking sign up card', e), null));
  const jobs: Promise<unknown>[] = [];
  if (card) jobs.push(board(`/cards/${card.id}/comments`, { body: `call-booked · ${when} · ${m.id} · ${m.address ?? 'none'} · ${m.case_id ?? 'none'} · via portal · booking ${url}` }));
  // The deck is about a home, so "a general question" (no case) gets the comment only.
  if (m.case_id) jobs.push(board('/cards', {
    title: `Briefing request · ${(roll ?? m.address ?? '').toUpperCase()} · ${m.case_id}`, status: 'todo', assignee: 'coordinator', key: `briefing-request:${m.id}`,
    body: [`case_id: ${m.case_id}`, `signup_card: ${card?.id ?? 'none'}`, 'source: website', `to: ${email}`, 'reply_to_message: none', `booking_url: ${url}`,
      `presenter_email: ${process.env.PRESENTER_EMAIL?.trim() || 'none'}`, `requested_slot: ${when}`, 'deck_version: build', 'update_only: no'].join('\n'),
  }));
  for (const r of await Promise.allSettled(jobs)) if (r.status === 'rejected') console.error('booking board signal', r.reason);
}

// What an owner can do from the portal. JSON body {t, action, ...}:
//   book       {name, slot, case_id?, address?, provider?, booking_ref?} → 201 {id, slot}   inserts a meetings row, then
//              signals the board. With booking_ref (booked in the embedded calendar) slot is optional and status is confirmed.
//   signed_poa {case_id}                         → 200 {case}            adds the signed DR-486POA to documents + history
//   message    {case_id, text}                   → 200 {case}            appends an owner message
// A bad token is 401; a field error is 400 {error, field}. No email goes out: the desk reads the rows.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = verify(str(b.t, 400));
  if (!email) return Response.json({ error: 'expired' }, { status: 401 });
  if (!['book', 'signed_poa', 'message'].includes(b.action)) return bad('Unknown action.', 'action');
  try {
    const { cases } = await ownerData(email);
    const c = cases.find((x) => x.case_id === b.case_id);
    if (b.case_id && !c) return bad('Pick one of your properties.', 'case_id');
    const now = new Date(), at = now.toISOString().slice(0, 10);

    if (b.action === 'book') {
      const name = str(b.name, 120), ref = str(b.booking_ref, 300), provider = str(b.provider, 20) || 'link';
      const slot = new Date(str(b.slot, 40)), ms = slot.getTime() - now.getTime();
      if (!name) return bad('Enter your name.', 'name');
      if (!ref && !(ms > 0 && ms < 60 * DAY)) return bad('Pick a time.', 'slot');
      const address = str(b.address, 200) || (c && [c.address, c.unit && `Unit ${c.unit}`, c.city].filter(Boolean).join(', ')) || null;
      const [row] = await db('meetings', { method: 'POST', body: JSON.stringify({ email, name, slot: isNaN(ms) ? null : slot.toISOString(), case_id: c?.case_id ?? null, address,
        status: ref ? 'confirmed' : 'requested', notes: ref ? `booked via ${provider} · ${ref}` : null }) });
      const signals = boardSignals(row, email.toLowerCase(), c?.address ?? null).catch((e) => console.error('booking board signals', e));
      // On Vercel the reply goes out now and the function stays up for the signals (the hook @vercel/functions' waitUntil reads); elsewhere they are awaited.
      const later = (globalThis as any)[Symbol.for('@vercel/request-context')]?.get?.()?.waitUntil;
      if (later) later(signals); else await signals;
      return Response.json({ id: row.id, slot: row.slot }, { status: 201 });
    }

    if (!c) return bad('Pick one of your properties.', 'case_id');
    let patch: Record<string, unknown> = {};
    if (b.action === 'signed_poa') {
      if (c.documents.some((d) => d.kind === 'dr486poa_signed')) return Response.json({ case: c });
      patch = {
        documents: [...c.documents, { name: 'DR-486POA (signed), your confirmation', kind: 'dr486poa_signed', at }],
        history: [...c.history, { date: at, line: 'You confirmed you signed the DR-486POA. We confirm once the copy reaches us.' }],
        // only the POA ask is answered by this; any other request to the owner stands
        ...(/486|power of attorney|\bPOA\b/i.test(c.needs_from_owner ?? '') ? { needs_from_owner: null } : {}),
      };
    } else if (b.action === 'message') {
      const text = str(b.text, 2000);
      if (!text) return bad('Write a message.', 'text');
      patch = { messages: [...c.messages, { at, from: 'owner', text }] };
    }

    // shortcut: read-then-write on the jsonb columns, two owners editing one case in the same second lose a row; move to an RPC if that ever matters
    const [row] = await db(`cases?case_id=eq.${encodeURIComponent(c.case_id)}`, { method: 'PATCH', body: JSON.stringify({ ...patch, updated_at: now.toISOString() }) });
    const { owner_email, ...out } = row;
    return Response.json({ case: out });
  } catch (e) { return fail(e); }
}
