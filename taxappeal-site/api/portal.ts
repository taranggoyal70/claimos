import { db, fail } from '../lib/lookup';
import { verify } from '../lib/token';
import { ownerData } from '../lib/portal';

const headers = { 'cache-control': 'no-store' };
type Meeting = { id: string; email: string; slot: string; status: string; address: string | null; case_id: string | null; name: string | null; notes: string | null };

// Everything the portal shows for the owner the token names: sign-ups, cases (documents, messages, history), meetings.
// Documents carry has_file instead of a link: /api/doc signs one file when the owner opens it, so file_id never reaches the browser.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  // ?warm=1 wakes this function and the database before the owner reaches the portal; always 204 so the console stays clean
  if (q.has('warm')) { await db('cases?select=case_id&limit=1').catch(() => {}); return new Response(null, { status: 204, headers }); }
  const email = verify(q.get('t') ?? '');
  // 200, not 401: browsers log every 4xx fetch to the console, and the body already says what happened
  if (!email) return Response.json({ error: 'expired' }, { headers });
  try {
    const enc = encodeURIComponent(email);
    const [{ signups, cases }, meetings] = await Promise.all([
      ownerData(email),
      db(`meetings?select=id,email,slot,status,address,case_id,name,notes&email=ilike.${enc}&order=slot.asc`) as Promise<Meeting[]>,
    ]);
    return Response.json({
      email, signups,
      cases: cases.map((c) => ({ ...c, documents: c.documents.map(({ file_id, ...d }) => (file_id ? { ...d, has_file: true } : d)) })),
      meetings: meetings.filter((m) => m.email.toLowerCase() === email).map(({ email, ...m }) => m),
    }, { headers: { 'cache-control': 'private, max-age=60, stale-while-revalidate=600' } });
  } catch (e) { return fail(e); }
}
