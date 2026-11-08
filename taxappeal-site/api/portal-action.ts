import { db, fail } from '../lib/lookup';
import { verify } from '../lib/token';
import { ownerData } from '../lib/portal';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (error: string, field: string) => Response.json({ error, field }, { status: 400 });
const DAY = 86400e3;

// What an owner can do from the portal. JSON body {t, action, ...}:
//   book       {name, slot, case_id?, address?}  → 201 {id, slot}        inserts a meetings row (status requested)
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
      const name = str(b.name, 120), slot = new Date(str(b.slot, 40)), ms = slot.getTime() - now.getTime();
      if (!name) return bad('Enter your name.', 'name');
      if (!(ms > 0 && ms < 60 * DAY)) return bad('Pick a time.', 'slot');
      const address = str(b.address, 200) || (c && [c.address, c.unit && `Unit ${c.unit}`, c.city].filter(Boolean).join(', ')) || null;
      const [row] = await db('meetings', { method: 'POST', body: JSON.stringify({ email, name, slot: slot.toISOString(), case_id: c?.case_id ?? null, address, status: 'requested' }) });
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
