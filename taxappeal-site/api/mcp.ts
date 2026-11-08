// The MCP endpoint our Naïve agents call (server name `claimos`). Bearer = app secret CLAIMOS_MCP_BEARER (vault-injected),
// or VETTA_MCP_TOKEN if the app is ever registered as a platform app MCP (`mcp: "/api/mcp"`). Compared in constant time
// on sha256 digests so the length leaks nothing; no secret on the app means every call is refused.
import { createHash, timingSafeEqual } from 'node:crypto';
import { rpc } from '../lib/mcp';

const sha = (s: string) => createHash('sha256').update(s).digest();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

function authorized(req: Request) {
  const got = sha((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
  return [process.env.CLAIMOS_MCP_BEARER, process.env.VETTA_MCP_TOKEN].some((want) => !!want && timingSafeEqual(got, sha(want)));
}

export async function POST(req: Request) {
  if (!authorized(req)) return json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'unauthorized' } }, 401);
  let body: any;
  try { body = await req.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }, 400); }
  const origin = new URL(req.url).origin;
  const out = Array.isArray(body) ? (await Promise.all(body.map((m) => rpc(m, origin)))).filter(Boolean) : await rpc(body, origin);
  if (out === null || (Array.isArray(out) && !out.length)) return new Response(null, { status: 202 });   // notifications only
  return json(out);
}

// No server-initiated stream: GET has nothing to offer.
export function GET() {
  return new Response('POST JSON-RPC here', { status: 405, headers: { allow: 'POST' } });
}
