// Self-check for api/portal.ts, api/track.ts and api/portal-action.ts against a fake PostgREST and file API: bun scripts/portal-test.ts
import assert from 'node:assert/strict';
Object.assign(process.env, { DATABASE_REST_URL: 'https://db.test/rest/', DATABASE_SERVICE_KEY: 'k', TRACK_SECRET: 's', NAIVE_API_KEY: 'n' });

const ME = 'francesco.rosciano@me.com';
const CASE = {
  case_id: 'FL-36-2026-1 28 44 31 A00 0179.0000', address: '7969    1ST PL', unit: null, city: 'WHEELER', county: 'Hendry',
  owner_email: 'Francesco.Rosciano@me.com', stage: 'evidence', needs_from_owner: 'Sign the DR-486POA (power of attorney) so we can file in your name.',
  history: [{ date: '2026-11-07', line: 'Drafted.' }], messages: [],
  documents: [{ name: 'DR-486POA draft', kind: 'dr486poa', file_id: 'fil_1', at: '2026-11-07' }, { name: 'Agreement (signed)', kind: 'agreement', at: '2026-11-04' }],
};
const calls: { url: string; method: string; body?: any }[] = [];
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = (async (input: any, init: any = {}) => {
  const url = String(input), method = init.method ?? 'GET', body = init.body ? JSON.parse(init.body) : undefined;
  calls.push({ url, method, body });
  if (url.startsWith('https://api.vetta.sh/v1/files/fil_1/url')) return json({ url: 'https://signed.test/draft.pdf' }, 201);
  if (url.includes('/signups?')) return json([{ email: ME, address: '520 Richard Jackson Blvd', city: 'Panama City Beach', zip: '32407', created_at: '2026-11-04', case_id: 'FL-13-2026-34801143000' }]);
  if (url.includes('/cases?') && method === 'GET') return json([
    CASE,
    { ...CASE, case_id: 'NULLS', documents: null, history: null, messages: null },                                        // null jsonb
    { ...CASE, case_id: 'FL-13-2026-34801143000', owner_email: null },                                                    // only the sign-up points here: not the owner's
    { ...CASE, case_id: 'LEAK', owner_email: 'francescoXrosciano@me.com' },                                              // what ilike's "_" lets through
  ]);
  if (url.includes('/cases?') && method === 'PATCH') return json([{ ...CASE, ...body }]);
  if (url.includes('/meetings?')) return json([
    { id: 'm1', email: ME, slot: '2026-11-12T20:00:00Z', status: 'confirmed', address: '7969 1st Pl', case_id: CASE.case_id, name: 'F', notes: null },
    { id: 'm2', email: 'francescoXrosciano@me.com', slot: '2026-11-13T20:00:00Z', status: 'confirmed', address: null, case_id: null, name: 'X', notes: null },
  ]);
  if (url.endsWith('/meetings') && method === 'POST') return json([{ id: 'm3', ...body }], 201);
  throw new Error('unexpected fetch ' + method + ' ' + url);
}) as typeof fetch;

const { sign } = await import('../lib/token.ts');
const { GET } = await import('../api/portal.ts');
const { GET: trackGET } = await import('../api/track.ts');
const { POST } = await import('../api/portal-action.ts');
const t = sign(ME);
const post = (body: unknown) => POST(new Request('https://x/api/portal-action', { method: 'POST', body: JSON.stringify(body) }));

// GET
const bad = await GET(new Request('https://x/api/portal?t=nope'));
assert.equal(bad.status, 200);                                                 // a 4xx would log a browser console line
assert.deepEqual(await bad.json(), { error: 'expired' });
const r = await GET(new Request('https://x/api/portal?t=' + encodeURIComponent(t)));
assert.equal(r.status, 200);
assert.equal(r.headers.get('cache-control'), 'no-store');
const d = await r.json();
assert.equal(d.email, ME);
assert.deepEqual(d.cases.map((c: any) => c.case_id), [CASE.case_id, 'NULLS']);
assert.ok(d.cases.every((c: any) => !('owner_email' in c)));
assert.deepEqual(d.cases[1].documents, []);                                    // null jsonb normalised
assert.equal(d.cases[0].documents[0].url, 'https://signed.test/draft.pdf');
assert.ok(!('file_id' in d.cases[0].documents[0]));
assert.equal(d.cases[0].documents[1].url, undefined);
assert.deepEqual(d.meetings.map((m: any) => m.id), ['m1']);
assert.ok(!('email' in d.meetings[0]));
assert.equal(d.signups[0].address, '520 Richard Jackson Blvd');
assert.ok(!calls.some((c) => c.url.includes('case_id.in.')), 'cases are matched on owner_email only');
const tr = await (await trackGET(new Request('https://x/api/track?t=' + encodeURIComponent(t)))).json();
assert.deepEqual(tr.cases.map((c: any) => c.case_id), [CASE.case_id, 'NULLS']);
assert.ok(tr.cases.every((c: any) => !('owner_email' in c)) && tr.signups[0].address === '520 Richard Jackson Blvd');

// Without a key, no file call and no url
delete process.env.NAIVE_API_KEY;
const n0 = calls.length;
const d2 = await (await GET(new Request('https://x/api/portal?t=' + encodeURIComponent(t)))).json();
assert.equal(d2.cases[0].documents[0].url, undefined);
assert.ok(!calls.slice(n0).some((c) => c.url.includes('api.vetta.sh')));

// POST guards
assert.equal((await post({ t: 'nope', action: 'book' })).status, 401);
assert.deepEqual(await (await post({ t, action: 'nope' })).json(), { error: 'Unknown action.', field: 'action' });
assert.equal((await (await post({ t, action: 'message', case_id: 'LEAK', text: 'hi' })).json()).field, 'case_id');
assert.equal((await (await post({ t, action: 'message', case_id: 'FL-13-2026-34801143000', text: 'hi' })).json()).field, 'case_id');

// book
const soon = new Date(Date.now() + 3 * 86400e3).toISOString();
assert.equal((await (await post({ t, action: 'book', slot: soon })).json()).field, 'name');
assert.equal((await (await post({ t, action: 'book', name: 'F', slot: '2020-01-01T10:00:00Z' })).json()).field, 'slot');
assert.equal((await (await post({ t, action: 'book', name: 'F', slot: new Date(Date.now() + 90 * 86400e3).toISOString() })).json()).field, 'slot');
const b = await post({ t, action: 'book', name: 'Francesco', slot: soon, case_id: CASE.case_id });
assert.equal(b.status, 201);
const ins = calls.at(-1)!;
assert.equal(ins.method, 'POST');
assert.deepEqual(ins.body, { email: ME, name: 'Francesco', slot: soon, case_id: CASE.case_id, address: '7969    1ST PL, WHEELER', status: 'requested' });
assert.equal((await b.json()).id, 'm3');
const g = await post({ t, action: 'book', name: 'F', slot: soon, address: 'A general question' });
assert.equal(g.status, 201);
assert.equal(calls.at(-1)!.body.case_id, null);

// signed_poa
const s = await post({ t, action: 'signed_poa', case_id: CASE.case_id });
assert.equal(s.status, 200);
const patch = calls.at(-1)!;
assert.equal(patch.method, 'PATCH');
assert.ok(patch.url.includes('cases?case_id=eq.' + encodeURIComponent(CASE.case_id)));
assert.equal(patch.body.documents.length, 3);
assert.equal(patch.body.documents[2].kind, 'dr486poa_signed');
assert.equal(patch.body.history.length, 2);
assert.equal(patch.body.needs_from_owner, null);
assert.ok(patch.body.updated_at);
const sc = (await s.json()).case;
assert.ok(!('owner_email' in sc) && sc.documents.length === 3);

// message
assert.equal((await (await post({ t, action: 'message', case_id: CASE.case_id, text: '  ' })).json()).field, 'text');
const m = await post({ t, action: 'message', case_id: CASE.case_id, text: 'Signed and sent.' });
assert.equal(m.status, 200);
assert.deepEqual(calls.at(-1)!.body.messages.map((x: any) => x.from), ['owner']);
assert.equal(calls.at(-1)!.body.messages[0].text, 'Signed and sent.');
assert.equal(calls.at(-1)!.body.needs_from_owner, undefined);
console.log('portal self-check ok');
