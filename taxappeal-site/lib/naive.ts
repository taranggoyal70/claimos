// Naïve REST with the app's NAIVE_API_KEY (agents:read, agents:write, files:read). Cloudflare answers 403 to default
// user agents, so every call names one. Errors carry the route and status, never the key.
const API = 'https://api.vetta.sh/v1';
export const BOARD = 'brd_3kb4zft8yttkhm04sv6vn8ydw2';   // the coordinator agt_84kdvn48drb35vhrpnzd71ex21's company board

const headers = () => ({ authorization: `Bearer ${process.env.NAIVE_API_KEY}`, accept: 'application/json', 'user-agent': 'claimos-site/1.0' });

export async function naive(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const method = init.method ?? 'GET';
  const r = await fetch(API + path, {
    method,
    headers: init.body === undefined ? headers() : { ...headers(), 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!r.ok) throw new Error(`naive ${method} ${path.split('?')[0]} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Every row of a list route: pages of 100, cursor fed back as `after`.
export async function all(path: string): Promise<any[]> {
  const out: any[] = [];
  for (let after = ''; ;) {
    const j = await naive(`${path}${path.includes('?') ? '&' : '?'}limit=100${after ? `&after=${after}` : ''}`);
    out.push(...j.data);
    if (!j.has_more || !j.next_cursor) return out;
    after = j.next_cursor;
  }
}

export const cards = () => all(`/boards/${BOARD}/cards`);
export const comments = (card: string) => all(`/boards/${BOARD}/cards/${card}/comments`);
export const comment = (card: string, body: string) => naive(`/boards/${BOARD}/cards/${card}/comments`, { method: 'POST', body: { body } });

// Streams a stored file line by line; onLine returns false to stop the download early.
export async function fileLines(id: string, onLine: (line: string) => boolean | void) {
  const r = await fetch(`${API}/files/${id}?download=true`, { headers: headers() });
  if (!r.ok || !r.body) throw new Error(`naive file ${id} ${r.status}`);
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let rest = '';
  for (;;) {
    const { value, done } = await reader.read();
    const parts = (rest + (value ?? '')).split('\n');
    rest = done ? '' : parts.pop()!;
    for (const line of parts) if (line && onLine(line) === false) { await reader.cancel(); return; }
    if (done) return;
  }
}
