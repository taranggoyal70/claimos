import { db } from '../lib/lookup';
import { verify } from '../lib/token';
import type { Doc } from '../lib/portal';

const text = (status: number, body: string) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

// GET /api/doc?t=&case=&i= : one portal document. Checks the token and that the case carries its email, then answers 302
// to a seven-day link for the org file, so file ids never reach the browser.
// NAIVE_API_KEY is a files:read-only key a person puts on the app with scripts/set-secrets.sh; it applies on the next deploy.
// Links serve the stored content type; these files were uploaded as application/octet-stream, so browsers download them.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams, email = verify(q.get('t') ?? ''), id = q.get('case') ?? '', i = q.get('i') ?? '';
  if (!email) return new Response(null, { status: 302, headers: { location: '/track?expired=1', 'cache-control': 'no-store' } });
  if (!id || !/^\d+$/.test(i)) return text(400, 'That document link is incomplete.');
  try {
    const [c] = (await db(`cases?select=owner_email,documents&case_id=eq.${encodeURIComponent(id)}`)) as { owner_email: string | null; documents: Doc[] | null }[];
    // The same ownership rule as lib/portal.ts: the case must carry this email.
    const doc = c && (c.owner_email ?? '').toLowerCase() === email ? (c.documents ?? [])[Number(i)] : undefined;
    if (!doc?.file_id) return text(404, 'We could not find that document. Email claimos@agentmail.to and we send you a copy.');
    if (!process.env.NAIVE_API_KEY) return text(503, 'Documents cannot be opened online yet. Email claimos@agentmail.to and we send you a copy.');
    const r = await fetch(`https://api.vetta.sh/v1/files/${encodeURIComponent(doc.file_id)}/url`, { method: 'POST', headers: { authorization: `Bearer ${process.env.NAIVE_API_KEY}` } });
    if (!r.ok) { console.error(`file url ${r.status} for ${doc.file_id}`); return text(502, 'We could not open that document right now. Email claimos@agentmail.to and we send you a copy.'); }
    return new Response(null, { status: 302, headers: { location: (await r.json()).url, 'cache-control': 'no-store' } });
  } catch (e) { console.error(e); return text(500, 'We could not open that document right now. Email claimos@agentmail.to and we send you a copy.'); }
}
