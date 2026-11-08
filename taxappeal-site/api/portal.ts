import { fail } from '../lib/lookup';
import { verify } from '../lib/token';
import { ownerData, warm } from '../lib/portal';

const headers = { 'cache-control': 'no-store' };

// Everything the portal shows for the owner the token names: sign-ups, cases (documents, messages, history), meetings.
// Documents carry has_file instead of a link: /api/doc signs one file when the owner opens it, so file_id never reaches the browser.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  // ?warm=1 wakes this function and the database before the owner reaches the portal; always 204 so the console stays clean
  if (q.has('warm')) { await warm(); return new Response(null, { status: 204, headers }); }
  const email = verify(q.get('t') ?? '');
  // 200, not 401: browsers log every 4xx fetch to the console, and the body already says what happened
  if (!email) return Response.json({ error: 'expired' }, { headers });
  try {
    const { signups, cases, meetings } = await ownerData(email);
    return Response.json({
      email, signups,
      cases: cases.map((c) => ({ ...c, documents: c.documents.map(({ file_id, ...d }) => (file_id ? { ...d, has_file: true } : d)) })),
      meetings,
    }, { headers: { 'cache-control': 'private, max-age=60, stale-while-revalidate=600' } });
  } catch (e) { return fail(e); }
}
