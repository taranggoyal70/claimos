// First contact by mail, server-side port of taxappeal-site-sync/letters.py: one letter per QUALIFIED case whose owner
// is an individual or a trust, carrying the claim code the owner types on /check. lib/letter.html is read at render
// time, so its wording is the only copy. Lob posts the letter; without LOB_API_KEY everything runs dry (render only).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from './lookup';
import { naive, cards, comments, comment, fileLines } from './naive';

const SITE = 'claimos-site-mds8vwd4myby.vercel.app';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 32 symbols, no 0/O/1/I
const MAIL_TO = new Set(['individual', 'trust']);
// shortcut: placeholder sender (Lob's own docs address); replace with Claim OS's real US business address before a live_ key.
const FROM = { name: 'Claim OS', address_line1: '210 King St', address_city: 'San Francisco', address_state: 'CA', address_zip: '94107' };

function secret() {
  const s = process.env.TRACK_SECRET;
  if (!s) throw new Error('TRACK_SECRET is not set on the app');
  return s;
}

export const codeFor = (caseId: string) =>
  [...createHash('sha256').update(caseId + secret()).digest().subarray(0, 8)].map((b) => ALPHABET[b % 32]).join('');

const sig = (code: string) => createHmac('sha256', secret()).update('claimos-letter:' + code).digest('base64url').slice(0, 22);
export const previewUrl = (origin: string, code: string) => `${origin}/api/letter?code=${code}&s=${sig(code)}`;
export function sigOk(code: string, s: string) {
  const a = Buffer.from(sig(code)), b = Buffer.from(s || '');
  return a.length === b.length && timingSafeEqual(a, b);
}

// dry: no key. test: Lob renders a PDF and mails nothing. live: real postage, refused unless LOB_LIVE=yes.
export function lobMode() {
  const k = process.env.LOB_API_KEY;
  return !k ? 'dry' : k.startsWith('test_') ? 'test' : process.env.LOB_LIVE === 'yes' ? 'live' : 'refused';
}

// --- board: QUALIFIED cases -------------------------------------------------------------------------------------
const caseBlock = (body: string | null) => {
  const m = (body ?? '').match(/```json\s*(\{[\s\S]*?\})\s*```/);
  try { return m ? JSON.parse(m[1]) : null; } catch { return null; }
};

type Hit = { card: any; json: any };
let boardCache: { at: number; hits: Map<string, Hit> } | null = null;

// case_id -> its card (Find's own `FL …` card when there are several) for every card whose note starts QUALIFIED.
// Cached a minute so a letters pass (letters_due, then send_letter per case) pages the 400-card board once.
export async function qualified(): Promise<Map<string, Hit>> {
  if (boardCache && Date.now() - boardCache.at < 60e3) return boardCache.hits;
  const hits = new Map<string, Hit>();
  for (const card of await cards()) {
    if (!(card.note ?? '').trim().toUpperCase().startsWith('QUALIFIED')) continue;
    const json = caseBlock(card.body);
    if (!json?.case_id) continue;
    const had = hits.get(json.case_id);
    if (!had || (!had.card.title?.startsWith('FL ') && card.title?.startsWith('FL '))) hits.set(json.case_id, { card, json });
  }
  boardCache = { at: Date.now(), hits };
  return hits;
}

// --- Find's full records (owner type and mailing address live only there) --------------------------------------
const records = new Map<string, any>();

// case_id -> record from the newest published candidates.jsonl that has it; stops downloading once all are found.
export async function findRecords(ids: Set<string>): Promise<Map<string, any>> {
  const want = new Set([...ids].filter((id) => !records.has(id)));
  if (want.size) {
    const files = (await naive('/files?search=candidates.jsonl&limit=50')).data
      .filter((f: any) => f.name === 'candidates.jsonl')
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
    for (const f of files) {
      await fileLines(f.id, (line) => {
        const id = line.slice(0, 200).match(/"case_id":\s*"([^"]+)"/)?.[1];
        if (id && want.has(id)) {
          const r = JSON.parse(line);
          records.set(id, { case_id: id, owner: r.owner, property: r.property, jurisdiction: r.jurisdiction, values: r.values, estimate: r.estimate });
          want.delete(id);
        }
        return want.size > 0;
      });
      if (!want.size) break;
    }
  }
  return new Map([...ids].filter((id) => records.has(id)).map((id) => [id, records.get(id)]));
}

const mailable = (rec: any) => MAIL_TO.has(rec?.owner?.type) && !!rec?.owner?.mailing_address?.line1;

// --- render: byte-for-byte what letters.py writes ----------------------------------------------------------------
const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const pyRound = (x: number) => { const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 ? r - 1 : r; };   // Python's round(): half to even
const money = (n: unknown) => '$' + (pyRound(Number(n)) + 0).toLocaleString('en-US');   // + 0: no "-0"
const title = (s: unknown) => String(s ?? '').split(/\s+/).filter(Boolean).join(' ').replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

// j = the case JSON the numbers come from (the board card's, as letters.py), rec = Find's full record (owner, mailing).
export function render(j: any, rec: any, code: string) {
  const p = j.property ?? {}, v = j.values ?? {}, e = j.estimate ?? {}, owner = rec.owner ?? {}, m = owner.mailing_address ?? {};
  if (![v.just_value, e.defensible_value, e.annual_savings].every((x) => x !== null && x !== '' && Number.isFinite(Number(x)))) throw new Error(`${j.case_id}: case JSON lacks a value`);
  const cityStateZip = `${m.city || ''}, ${m.state || ''} ${m.zip || ''}`.replace(/^[, ]+|[, ]+$/g, '');
  const unit = p.unit ? ` #${p.unit}` : '';
  const prop = `${title(p.address)}${unit}, ${title(p.city || rec.property?.city)}, FL ${rec.property?.zip || ''}`.trimEnd();
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
  const vals: Record<string, string> = Object.fromEntries(Object.entries({
    date, property: prop, county: j.jurisdiction?.county ?? '', year: String(rec.jurisdiction?.tax_year || j.case_id.split('-')[2]),
    county_value: money(v.just_value), our_value: money(e.defensible_value), savings: money(e.annual_savings), code, site: SITE, case_id: j.case_id,
  }).map(([k, x]) => [k, esc(x)]));
  vals.mail = [owner.name, m.line1, m.line2, cityStateZip].filter(Boolean).map(esc).join('<br>');
  const tpl = readFileSync(join(__dirname, 'letter.html'), 'utf8');
  // string.Template.substitute: $$, $name, ${name}; an unknown name is an error, never a blank in a mailed letter
  return tpl.replace(/\$(?:(\$)|([_a-z][_a-z0-9]*)|\{([_a-z][_a-z0-9]*)\})/gi, (_, d, a, b) => {
    if (d) return '$';
    const k = a ?? b;
    if (!(k in vals)) throw new Error(`letter.html uses an unknown $${k}`);
    return vals[k];
  });
}

// --- tools -------------------------------------------------------------------------------------------------------
const inList = (ids: string[]) => `in.(${ids.map((id) => encodeURIComponent(`"${id}"`)).join(',')})`;

// QUALIFIED cases, owner individual/trust with a mailing address, claim_codes.mailed_at null.
// shortcut: letter-sent comments are checked per case in sendLetter, not here (one comments GET per card is ~0.75 s).
export async function lettersDue() {
  const hits = await qualified();
  const ids = [...hits.keys()];
  const mailed = new Set<string>();
  for (let i = 0; i < ids.length; i += 100) {
    const rows = await db(`claim_codes?select=case_id,mailed_at&case_id=${inList(ids.slice(i, i + 100))}`);
    for (const r of rows) if (r.mailed_at) mailed.add(r.case_id);
  }
  const open = ids.filter((id) => !mailed.has(id));
  const recs = await findRecords(new Set(open));
  const due = open.filter((id) => mailable(recs.get(id))).sort();
  return {
    lob: lobMode(),
    count: due.length,
    due: due.map((id) => ({ case_id: id, code: codeFor(id), card_id: hits.get(id)!.card.id })),
    skipped: { already_mailed: mailed.size, no_find_record: open.filter((id) => !recs.has(id)).length, not_individual_or_trust: open.filter((id) => recs.has(id) && !mailable(recs.get(id))).length },
  };
}

const PER_PASS = 10;   // letters started per all_due call: bounds postage, board comments and the 60 s function limit

// The letters agent's one call per pass: every due case, up to PER_PASS letters; the rest wait for the next pass.
export async function sendAllDue(origin: string) {
  const t0 = Date.now();
  const due = await lettersDue();
  const results: any[] = [];
  let started = 0;
  for (const d of due.due) {
    if (started >= PER_PASS || Date.now() - t0 > 40e3) break;   // a live letter takes ~5 s: stay under 60 s
    const r: any = await sendLetter(d.case_id, origin);
    results.push(r);
    if (!r.skipped) started++;
  }
  return { lob: due.lob, due: due.count, results, left_for_next_pass: due.count - results.length };
}

// Autonomy rule: a failed case gets `letter-failed`, the next pass retries it once, a second failure writes
// `letter-gave-up` and the case is skipped from then on. Nothing waits for a person.
export async function sendLetter(caseId: string, origin: string) {
  if (lobMode() === 'refused') throw new Error('LOB_API_KEY is a live key and LOB_LIVE is not yes: nothing mailed');
  const hit = (await qualified()).get(caseId);
  if (!hit) return { case_id: caseId, skipped: 'no QUALIFIED card for this case on the board' };
  const notes = (await comments(hit.card.id)).map((c) => String(c.body ?? ''));
  if (notes.some((b) => b.startsWith('letter-sent'))) return { case_id: caseId, skipped: 'letter-sent comment already on the card' };
  if (notes.some((b) => b.startsWith('letter-gave-up'))) return { case_id: caseId, skipped: 'gave up after failing on two passes' };
  try {
    return await deliver(caseId, hit, notes, origin);
  } catch (e) {
    const reason = String((e as Error).message ?? e).replace(/\s+/g, ' ').slice(0, 160);
    const giveUp = notes.some((b) => b.startsWith('letter-failed'));
    await comment(hit.card.id, `${giveUp ? 'letter-gave-up' : 'letter-failed'} · ${codeFor(caseId)} · ${reason}`).catch(() => {});
    return { case_id: caseId, failed: reason, gave_up: giveUp };
  }
}

async function deliver(caseId: string, hit: Hit, notes: string[], origin: string) {
  const mode = lobMode();
  const rec = (await findRecords(new Set([caseId]))).get(caseId);
  if (!rec) return { case_id: caseId, skipped: 'no Find record in any candidates.jsonl' };
  if (!mailable(rec)) return { case_id: caseId, skipped: `owner type ${rec.owner?.type ?? 'unknown'} or no mailing address` };
  const code = codeFor(caseId);
  const [row] = await db(`claim_codes?code=eq.${code}&select=mailed_at`);
  if (row?.mailed_at) return { case_id: caseId, code, skipped: 'claim_codes.mailed_at already set' };
  // The code row first: /check must resolve it before any letter quoting it exists (the FK also needs the candidate).
  if (!row) await db('claim_codes', { method: 'POST', body: JSON.stringify({ code, case_id: caseId }) });
  const html = render(hit.json, rec, code);
  const preview = previewUrl(origin, code);

  if (mode === 'dry') {
    const note = `letter-rendered · ${code} · ${preview}`;   // deduped on the whole line, so a local run's link never blocks the app's
    if (!notes.includes(note)) await comment(hit.card.id, note);
    return { case_id: caseId, code, lob: mode, mailed: false, preview_url: preview };
  }

  const m = rec.owner.mailing_address;
  const r = await fetch('https://api.lob.com/v1/letters', {
    method: 'POST',
    headers: { authorization: 'Basic ' + Buffer.from(process.env.LOB_API_KEY + ':').toString('base64'), 'content-type': 'application/json', 'idempotency-key': code },
    body: JSON.stringify({
      description: caseId,
      to: { name: String(rec.owner.name).slice(0, 40), address_line1: m.line1, ...(m.line2 ? { address_line2: m.line2 } : {}), address_city: m.city, address_state: m.state, address_zip: m.zip },
      from: FROM, file: html, color: false, use_type: 'operational', mail_type: 'usps_first_class',
      address_placement: 'insert_blank_page', merge_variables: null,
    }),
  });
  const out: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`lob ${r.status}: ${out?.error?.message ?? 'no error message'}`);
  await db(`claim_codes?code=eq.${code}`, { method: 'PATCH', body: JSON.stringify({ mailed_at: new Date().toISOString() }) });
  await comment(hit.card.id, `letter-sent · ${code} · ${out.id} · ${out.expected_delivery_date}`);
  return { case_id: caseId, code, lob: mode, mailed: mode === 'live', letter_id: out.id, pdf_url: out.url, expected_delivery_date: out.expected_delivery_date, preview_url: preview };
}

// The rendered letter for a claim code from Find's record alone (no board paging); renders match the card-JSON ones byte for byte.
export async function letterByCode(code: string) {
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) return null;
  const [cc] = await db(`claim_codes?code=eq.${code}&select=case_id`);
  if (!cc) return null;
  const rec = (await findRecords(new Set([cc.case_id]))).get(cc.case_id);
  return rec ? { case_id: cc.case_id as string, html: render(rec, rec, code) } : null;
}
