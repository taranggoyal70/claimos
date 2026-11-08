// The company board through Naïve's REST API (shapes: scratchpad board-rest-shapes.md, probed 2026-11-08).
// REST has no column filter: list() pages the whole board with `?after=`; comments cost ~0.75 s each, so callers
// fetch them only for the cards they need. NAIVE_API_KEY needs agents:read (reads) and agents:write (writes).
const BASE = 'https://api.vetta.sh/v1';
export const BOARD = 'brd_3kb4zft8yttkhm04sv6vn8ydw2';   // owner agt_84kdvn48drb35vhrpnzd71ex21, the org's only board

export type Card = {
  id: string; title: string; body: string | null; note: string | null; status: string; assignee: string | null;
  blocked_by: string[]; created_at: string; updated_at: string;
};
export type Comment = { id: string; card_id: string; author: string; body: string | null; created_at: string };

async function api(path: string, init: { method?: string; body?: unknown } = {}) {
  if (!process.env.NAIVE_API_KEY) throw new Error('NAIVE_API_KEY is not set on the app');
  const r = await fetch(BASE + path, {
    method: init.method ?? 'GET',
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    // Cloudflare answers 403 "error code: 1010" to library default user agents
    headers: { authorization: `Bearer ${process.env.NAIVE_API_KEY}`, accept: 'application/json', 'user-agent': 'claimos-site/1.0', 'content-type': 'application/json' },
  });
  if (!r.ok) throw new Error(`board ${init.method ?? 'GET'} ${path.split('?')[0]} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return { status: r.status, json: await r.json() };
}

async function pages<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let after = ''; ;) {
    const { json } = await api(`${path}?limit=100${after ? `&after=${after}` : ''}`);
    out.push(...json.data);
    if (!json.has_more) return out;
    after = json.next_cursor;
  }
}

export const cards = () => pages<Card>(`/boards/${BOARD}/cards`);
export const comments = (cid: string) => pages<Comment>(`/boards/${BOARD}/cards/${cid}/comments`);

// `key` makes the add idempotent: the same key again answers 200 with the card it already made (201 = new).
export async function addCard(c: { title: string; body: string; status?: string; assignee?: string; key: string }) {
  const { status, json } = await api(`/boards/${BOARD}/cards`, { method: 'POST', body: c });
  return { card: json as Card, created: status === 201 };
}
export const patchCard = async (cid: string, patch: Partial<Pick<Card, 'status' | 'assignee' | 'note' | 'title'>>) =>
  (await api(`/boards/${BOARD}/cards/${cid}`, { method: 'PATCH', body: patch })).json as Card;
export const addComment = async (cid: string, body: string) =>
  (await api(`/boards/${BOARD}/cards/${cid}/comments`, { method: 'POST', body: { body } })).json as Comment;

// Run fn over items, n at a time (comment reads: ~10 in flight keeps a pass well inside Vercel's 60 s).
export async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}
