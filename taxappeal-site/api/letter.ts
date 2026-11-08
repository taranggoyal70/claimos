// GET /api/letter?code=XXXXXXXX&s=<sig>: the rendered letter for a claim code. The link is HMAC-signed by
// lib/letters.ts (send_letter's board comment carries it) because the letter shows the owner's mailing address.
import { letterByCode, sigOk } from '../lib/letters';

const text = (status: number, body: string) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = (u.searchParams.get('code') ?? '').toUpperCase();
  if (!sigOk(code, u.searchParams.get('s') ?? '')) return text(404, 'No such letter.');
  try {
    const l = await letterByCode(code);
    if (!l) return text(404, 'No such letter.');
    return new Response(l.html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } });
  } catch (e) {
    console.error(e);
    return text(500, 'The letter could not be rendered.');
  }
}
