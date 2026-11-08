import { db, fail } from '../lib/lookup';
import { verify } from '../lib/token';
import { ownerData, type Doc } from '../lib/portal';

const headers = { 'cache-control': 'no-store' };
type Meeting = { id: string; email: string; slot: string; status: string; address: string | null; case_id: string | null; name: string | null; notes: string | null };

// A seven-day link for a document kept as an org file. No NAIVE_API_KEY, or a failed call, leaves the row with no url
// (the page shows it as "on file"); file_id never reaches the browser.
// NAIVE_API_KEY is a files:read-only key set on the app by hand; a secret applies on the next deploy. One-time setup:
//   naive keys create --name "app claimos-site (files:read)" --scopes files:read      (the key value is shown once)
//   curl -X POST https://api.vetta.sh/v1/apps/app_nkhc92xe21cyzfd5qakpkcj4g4/secrets -H "authorization: Bearer <admin key>" \
//     -H 'content-type: application/json' -d '{"name":"NAIVE_API_KEY","value":"<that key>"}'   then deploy
// Links serve the stored content type; these files were uploaded as application/octet-stream, so browsers download them.
async function linked({ file_id, ...doc }: Doc): Promise<Doc> {
  if (!file_id || doc.url || !process.env.NAIVE_API_KEY) return doc;
  try {
    const r = await fetch(`https://api.vetta.sh/v1/files/${encodeURIComponent(file_id)}/url`, { method: 'POST', headers: { authorization: `Bearer ${process.env.NAIVE_API_KEY}` } });
    if (r.ok) doc.url = (await r.json()).url;
    else console.error(`file url ${r.status} for ${file_id}`);
  } catch (e) { console.error(e); }
  return doc;
}

// Everything the portal shows for the owner the token names: sign-ups, cases (documents, messages, history), meetings.
export async function GET(req: Request) {
  const email = verify(new URL(req.url).searchParams.get('t') ?? '');
  if (!email) return Response.json({ error: 'expired' }, { status: 401, headers });
  try {
    const enc = encodeURIComponent(email);
    const [{ signups, cases }, meetings] = await Promise.all([
      ownerData(email),
      db(`meetings?select=id,email,slot,status,address,case_id,name,notes&email=ilike.${enc}&order=slot.asc`) as Promise<Meeting[]>,
    ]);
    const out = await Promise.all(cases.map(async (c) => ({ ...c, documents: await Promise.all(c.documents.map(linked)) })));
    return Response.json({
      email, signups, cases: out,
      meetings: meetings.filter((m) => m.email.toLowerCase() === email).map(({ email, ...m }) => m),
    }, { headers });
  } catch (e) { return fail(e); }
}
