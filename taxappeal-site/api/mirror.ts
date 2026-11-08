// One mirror pass over HTTP (the MCP tool `mirror_run` calls lib/mirror.ts directly). POST {"dry": true, "only": ["owner"]}
// with the bearer CLAIMOS_MCP_BEARER, compared in constant time on sha256 digests; no secret on the app refuses every call.
import { createHash, timingSafeEqual } from 'node:crypto';
import { mirrorRun } from '../lib/mirror';

const sha = (s: string) => createHash('sha256').update(s).digest();

export async function POST(req: Request) {
  const want = process.env.CLAIMOS_MCP_BEARER, got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!want || !timingSafeEqual(sha(got), sha(want))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  try {
    return Response.json(await mirrorRun({ dry: b.dry !== false, only: Array.isArray(b.only) ? b.only.map(String) : undefined }), { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: 'mirror_failed', detail: String(e) }, { status: 500 });
  }
}
