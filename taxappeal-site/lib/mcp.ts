// MCP over Streamable HTTP, stateless and JSON-only (no SSE): initialize, ping, tools/list, tools/call; notifications get
// no reply. Agents reach it as server `claimos`. Each tool result is one text block of JSON; failures set isError.
import { lettersDue, sendLetter, sendAllDue, letterByCode, previewUrl, lobMode } from './letters';
import { naive, BOARD } from './naive';
import { mirrorRun, STEPS } from './mirror';

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const obj = (properties: Record<string, unknown> = {}, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });

export const TOOLS = [
  { name: 'health', description: 'Checks the app can reach the board, the Find files and the database, and which Lob mode letters run in (dry, test, live).', inputSchema: obj() },
  { name: 'letters_due', description: 'QUALIFIED cases whose owner (individual or trust) has a mailing address and no letter mailed yet. Returns {lob, count, due:[{case_id, code, card_id}], skipped}.', inputSchema: obj() },
  { name: 'send_letter', description: 'Renders and posts letters to Lob (dry mode: render only, comment letter-rendered with a preview link). {all_due: true} sends every due case, up to 10 a call, one result per case; {case_id} sends one. Idempotent: a case already mailed is skipped; a case failing on two passes is given up and marked on its card.', inputSchema: obj({ all_due: { type: 'boolean' }, case_id: { type: 'string' } }) },
  { name: 'letter_preview', description: 'The rendered letter HTML and its signed preview URL for a claim code.', inputSchema: obj({ code: { type: 'string' } }, ['code']) },
  { name: 'mirror_run', description: 'One pass of the board mirror and bridges into the site database. dry: report the writes without doing them. only: run one part.', inputSchema: obj({ dry: { type: 'boolean' }, only: { type: 'array', items: { type: 'string', enum: [...STEPS] } } }) },
];

async function health() {
  const check = async (f: () => Promise<unknown>) => { try { return await f(); } catch (e) { return { error: String((e as Error).message ?? e) }; } };
  const [board, files] = await Promise.all([
    check(async () => (await naive(`/boards/${BOARD}`)).cards),
    check(async () => (await naive('/files?search=candidates.jsonl&limit=1')).data.length),
  ]);
  return { ok: !(board as any)?.error && !(files as any)?.error, board_columns: board, find_files_visible: files, lob: lobMode(), track_secret: !!process.env.TRACK_SECRET };
}

async function call(name: string, args: any, origin: string): Promise<unknown> {
  switch (name) {
    case 'health': return health();
    case 'letters_due': return lettersDue();
    case 'send_letter':
      if (args?.all_due === true) return sendAllDue(origin);
      if (typeof args?.case_id !== 'string' || !args.case_id) throw new Error('pass {all_due: true} or {case_id}');
      return sendLetter(args.case_id, origin);
    case 'letter_preview': {
      const code = String(args?.code ?? '').trim().toUpperCase();
      const l = await letterByCode(code);
      return l ? { code, case_id: l.case_id, url: previewUrl(origin, code), html: l.html } : { error: `no letter for code ${code}` };
    }
    // {} is a real pass (site-sync's call); only dry: true plans without writing.
    case 'mirror_run': return mirrorRun({ dry: args?.dry === true, only: Array.isArray(args?.only) ? args.only.map(String) : undefined });
    default: throw new Error(`unknown tool ${name}`);
  }
}

const reply = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id, result });
const error = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });

// One JSON-RPC message in, its response out (null for a notification).
export async function rpc(msg: any, origin: string) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return error(msg?.id ?? null, -32600, 'invalid request');
  if (msg.id === undefined || msg.id === null) return null;
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : VERSIONS[1],
        capabilities: { tools: {} },
        serverInfo: { name: 'claimos', version: '1.0.0' },
      });
    case 'ping': return reply(id, {});
    case 'tools/list': return reply(id, { tools: TOOLS });
    case 'tools/call':
      if (!TOOLS.some((t) => t.name === params?.name)) return error(id, -32602, `unknown tool ${params?.name}`);
      try {
        const out: any = await call(params.name, params.arguments ?? {}, origin);
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(out) }], isError: !!out?.error });
      } catch (e) {
        return reply(id, { content: [{ type: 'text', text: JSON.stringify({ error: String((e as Error).message ?? e) }) }], isError: true });
      }
    default: return error(id, -32601, `method not found: ${method}`);
  }
}
