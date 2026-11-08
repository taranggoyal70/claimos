// The board mirror, server-side: a port of taxappeal-site-sync/mirror_board.py + sync.py (through a332f84) to the board
// REST (lib/naive-board.ts) and PostgREST, plus three bridges for hand-offs no teammate agent writes:
//   (a) Sign up -> Evidence, (b) Escalate/Collect owner updates -> Message cards, (c) File submitted -> Waiting on card,
//   (d) portal meetings -> Briefing request card (lib/booking-board.ts signalBooking, key briefing-request:<meeting id>).
// One pass: page the board (~5 pages, ~7 s), read comments only for the cards a step needs (~10 in flight), then write.
// Every write is idempotent: card keys (signup:<row id>, message:signup:<row id>, msg:<comment id>, waiting:<case_id>),
// the Find card's assignee for (a), message ids for cases.messages. `dry` returns the planned writes and changes nothing.
import { db } from './lookup';
import { cards, comments, addCard, patchCard, addComment, pool, type Card, type Comment } from './naive-board';
import { signalBooking } from './booking-board';

export const STEPS = ['cases', 'signups', 'messages', 'evidence', 'owner', 'waiting', 'meetings'] as const;
type Step = (typeof STEPS)[number];

const DEMO_OWNER = 'francesco.rosciano@me.com';   // the portal's seeded mock account: the only owner rows the board never overwrites
const PRIVATE = 'Claim OS is a private company and is not affiliated with any government agency.';
const RANK: Record<string, number> = { find: 0, qualify: 1, signup: 2, evidence: 3, file: 4, waiting: 5, appeal: 6, won: 7, stopped: -1 };
// the card body, in order; `from:` repeats the email because briefing and signup's invoice rule check `to` against a card's from: line
const SIGNUP_FIELDS = ['email', 'from', 'address', 'phone', 'call_ok', 'consent', 'verdict', 'case_id', 'claim_code'];
// signup.system.md's owner script: every new website sign-up gets it through a `Message ·` card assigned to signup.
const OWNER_SCRIPT = (addr: string, call: string) => `Thank you for signing up with Claim OS for ${addr}.

Could you reply to confirm that you are the owner of record, and whether you received this year's TRIM notice (the proposed-value letter the county mails in August)?

What happens next: we check the county's value against comparable sales for free. If the home looks over-assessed, we send you a short agreement and the county's authorization form (DR-486POA, https://floridarevenue.com/property/Documents/dr486poa.pdf) to sign, and we only get paid if the value goes down, on the terms in the agreement. Photos of damage or repair quotes help but are optional; you can send them later.
${call}
${PRIVATE}
the Claim OS team`;

// sync.py stage(): the title prefix says which desk wrote the card, the status how far it got, and on a closed Find card
// the note's first word is the desk's verdict.
export function stage(title: string, status: string, assignee: string | null, note = '') {
  const t = title.trim().toLowerCase(), a = (assignee ?? '').trim().toLowerCase(), n = note.trim().toUpperCase();
  if (t.startsWith('waiting on')) return n.startsWith('WON') ? 'won' : n.startsWith('APPEAL') ? 'appeal' : n.startsWith('STOPPED') ? 'stopped' : 'waiting';
  if (t.startsWith('sign up')) return 'signup';
  if (t.startsWith('collect')) return 'won';                       // Escalate opens a Collect card only after a win
  if (t.startsWith('file')) return status === 'done' ? 'waiting' : 'file';
  if (status === 'done') return n.startsWith('REJECTED') ? 'stopped' : n.startsWith('QUALIFIED') ? 'qualify' : 'file';
  if (a === 'evidence') return 'evidence';
  if (a === 'file') return 'file';
  return status === 'blocked' ? 'stopped' : 'find';
}
// sync.py substatus(): on a Collect card the note says INVOICE · … or PAID · …; else the card status.
const substatus = (title: string, status: string, note = '') => {
  const n = note.trim().toUpperCase();
  return title.trim().toLowerCase().startsWith('collect') && (n.startsWith('PAID') || n.startsWith('INVOICE')) ? (n.startsWith('PAID') ? 'paid' : 'invoice') : status;
};
// sync.py rank_sql(): the upsert guard ranks stopped last, not -1: an owner's row can reach it and never leaves it.
const guardRank = (s: string | null) => (s === 'stopped' ? Object.keys(RANK).length : RANK[s ?? ''] ?? -1);

const caseBlock = (body: string | null): any => {
  const m = (body ?? '').match(/```json\s*(\{[\s\S]*?\})\s*```/);
  try { return m ? JSON.parse(m[1]) : null; } catch { return null; }
};
const rawBlock = (body: string | null) => (body ?? '').match(/```json\s*\n?(\{[\s\S]*?\})\s*```/)?.[1] ?? null;
const lastPart = (title: string) => title.split(' · ').at(-1)!.trim();
const py = (v: unknown) => (v == null ? '' : typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v));   // as mirror_board.py wrote it
const when = (s: string) => Date.parse(s.trim().replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));        // PostgREST and naive db formats
const lines = (body: string | null) => (body ?? '').split('\n');

// PostgREST through the platform; lookup.db() always asks for return=representation, an upsert needs merge-duplicates.
async function upsert(table: string, rows: object[]) {
  const REST = (process.env.DATABASE_REST_URL as string).replace(/\/$/, ''), KEY = process.env.DATABASE_SERVICE_KEY as string;
  const r = await fetch(`${REST}/${table}?on_conflict=case_id`, { method: 'POST', body: JSON.stringify(rows), headers: {
    apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' } });
  if (!r.ok) throw new Error(`db upsert ${table} ${r.status}: ${(await r.text()).slice(0, 300)}`);
}
async function allRows(path: string) {
  const out: any[] = [];
  for (let off = 0; ; off += 1000) {   // one read returns at most 1,000 rows
    const page = await db(`${path}&offset=${off}`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

// The owner's mail as they wrote it (extracted_text drops the quoted thread), or null when it cannot be read.
async function ownerText(messageId: string) {
  if (!process.env.AGENTMAIL_API_KEY) return null;
  try {
    const r = await fetch('https://api.agentmail.to/v0/inboxes/claimos@agentmail.to/messages/' + encodeURIComponent(messageId),
      { headers: { authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}` }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const d = await r.json();
    return (d.extracted_text || d.text || '').trim().slice(0, 2000) || null;
  } catch { return null; }
}

export async function mirrorRun(opts: { dry: boolean; only?: string[] }) {
  const t0 = Date.now(), dry = opts.dry;
  const on = (s: Step) => !opts.only?.length || opts.only.includes(s);
  const writes: string[] = [], errors: string[] = [], out: Record<string, unknown> = { dry };
  const write = async <T>(desc: string, f: () => Promise<T>) => { writes.push(desc); return dry ? undefined : f(); };

  // --- board read: mirror_board.main() ---
  const board = await cards();
  const byId = new Map(board.map((c) => [c.id, c]));
  const findCard = new Map<string, Card>(), website = new Set<string>(), msgCards: Card[] = [], signupCards: Card[] = [];
  const rows = new Map<string, { row: any; st: string; collect: boolean }>();
  for (const c of board) {
    const body = c.body ?? '', title = c.title ?? '';
    if (title.startsWith('Message · ')) msgCards.push(c);
    else if (title.startsWith('Sign up · ')) signupCards.push(c);
    if (body.includes('source: website')) {   // a website Sign up card; its email/date lines name the signups row
      const kv = Object.fromEntries(lines(body).map((l) => l.match(/^(email|date): (.*)$/)).filter(Boolean).map((m) => [m![1], m![2]]));
      website.add(`${kv.email}|${when(kv.date ?? '')}`);
    }
    const j = caseBlock(body);
    if (!j?.case_id) continue;
    if (title.startsWith('FL ') || !findCard.has(j.case_id)) findCard.set(j.case_id, c);   // Find's own card, else any card of the case
    const note = (c.note ?? '').slice(0, 20), st = stage(title, c.status, c.assignee, note), collect = title.trim().toLowerCase().startsWith('collect');
    const p = j.property ?? {}, v = j.values ?? {}, e = j.estimate ?? {};
    const prev = rows.get(j.case_id);
    // several cards share a case (Find's, the File hand-off, Collect): keep the furthest step; on a tie the Collect card wins
    if (!prev || RANK[st] > RANK[prev.st] || (RANK[st] === RANK[prev.st] && collect)) rows.set(j.case_id, { st, collect, row: {
      case_id: j.case_id, address: (p.address ?? '').trim() || null, county: (j.jurisdiction?.county ?? '').trim() || null,
      county_value: v.just_value ?? null, requested_value: e.defensible_value ?? null, annual_savings: e.annual_savings ?? null,
      stage: st, status: substatus(title, c.status, note), updated_at: c.updated_at } });
  }
  out.board = { cards: board.length, case_cards: rows.size, message_cards: msgCards.length, signup_cards: signupCards.length };

  const cases = new Map<string, any>((await allRows('cases?select=case_id,owner_email,stage,address,messages&order=case_id')).map((r) => [r.case_id, r]));
  const signups = on('signups') ? await db('signups?consent=is.true&order=created_at&select=*') as any[] : [];
  const authCards = [...new Set(signups.map((s) => s.case_id && findCard.get(s.case_id)).filter(Boolean))] as Card[];   // e858143's authorization: line

  // Comments: only for the cards a step reads, fetched once, ~10 in flight.
  const sources = board.filter((c) => /^(DEMO · )?(Waiting on|Collect · )/.test(c.title));                      // (b)
  const fileCards = board.filter((c) => c.title.startsWith('File · '));                                         // (c)
  const need = [...new Set([...(on('messages') ? msgCards : []), ...(on('signups') || on('messages') || on('evidence') || on('owner') ? signupCards : []),
    ...authCards, ...(on('owner') ? sources : []), ...(on('waiting') ? fileCards.flatMap((c) => [c, findCard.get(lastPart(c.title))!].filter(Boolean)) : [])])];
  const cm = new Map<string, Comment[]>();
  await pool(need, 10, async (c) => cm.set(c.id, await comments(c.id)));
  const texts = (c: Card) => [c.body ?? '', ...(cm.get(c.id) ?? []).map((x) => x.body ?? '')];
  // The website card names its case in the body; a mail-born card gets it from the coordinator's claim-link comment.
  const caseOf = (c: Card) => {
    for (const t of texts(c)) { const m = t.match(/(?:^case_id: |claim-link · case )(.+?)(?: · |$)/m); if (m?.[1].trim()) return m[1].trim(); }
    return null;
  };
  const signupEmail = (caseId: string) => {
    for (const c of signupCards) if (caseOf(c) === caseId) { const m = (c.body ?? '').match(/^(?:from|email): *(\S+@\S+)/m); if (m) return m[1]; }
    return null;
  };

  // --- cases upsert: sync.py cases() ---
  if (on('cases')) try {
    // The demo seed's rows are hand-written fiction: the board never overwrites them. A real owner's row keeps its owner_email
    // (the upsert never sets it) and only moves forward; a row nobody owns mirrors the board as is.
    // shortcut: read-then-write instead of sync.py's single guarded SQL upsert; a sign-up landing mid-pass can be overwritten once, next pass corrects it.
    let demo = 0;
    const up = [...rows.values()].filter(({ row, st }) => {
      const cur = cases.get(row.case_id);
      if (cur?.owner_email === DEMO_OWNER) return demo++, false;
      return !cur?.owner_email || guardRank(st) >= guardRank(cur.stage);
    }).map((x) => x.row);
    for (let i = 0; i < up.length; i += 500) await write(`upsert ${up.slice(i, i + 500).length} cases rows`, () => upsert('cases', up.slice(i, i + 500)));
    out.cases = { upserted: up.length, stage_changes: up.filter((r) => cases.get(r.case_id)?.stage !== r.stage).length, skipped_demo_rows: demo };
  } catch (e) { errors.push(`cases: ${e}`); }

  // --- website sign-ups -> board: mirror_board.mirror_signups() ---
  if (on('signups')) try {
    const rowsS = signups;
    let fresh = 0;
    for (const s of rowsS) {
      if (website.has(`${s.email}|${when(s.created_at)}`)) continue;
      const addr = [s.address, s.city].filter(Boolean).join(', ') + (s.zip ? ` ${s.zip}` : '');
      const body = SIGNUP_FIELDS.map((k) => `${k}: ${py(s[k === 'from' ? 'email' : k])}`).join('\n') + `\nsource: website\ndate: ${s.created_at}`;
      const made = await write(`add Sign up · ${addr} (blocked, key signup:${s.id})`, () => addCard({ title: `Sign up · ${addr}`, body, status: 'blocked', key: `signup:${s.id}` }));
      if (made && (!made.created || byId.has(made.card.id))) continue;   // the key's card already stood
      fresh++;
      const call = s.call_ok && s.phone ? `\nA colleague will call you at ${s.phone}.\n` : '';
      await write(`add Message · ${addr} · ${s.case_id || 'no case'} to ${s.email} (key message:signup:${s.id})`, () => addCard({ title: `Message · ${addr} · ${s.case_id || 'no case'}`,
        status: 'todo', assignee: 'signup', key: `message:signup:${s.id}`, body: `to: ${s.email}\n` + OWNER_SCRIPT(addr, call) }));
      if (s.case_id) {
        // never steal a case another owner (or the demo seed) already holds; the owner signed, so the tracker shows the sign-up step
        await write(`cases ${s.case_id}: owner_email ${s.email}, stage signup (if unowned)`, () => db(`cases?case_id=eq.${encodeURIComponent(s.case_id)}&owner_email=is.null`,
          { method: 'PATCH', body: JSON.stringify({ owner_email: s.email, stage: 'signup', updated_at: new Date().toISOString() }) }));
        const fc = findCard.get(s.case_id);
        if (fc) await write(`comment ${fc.id}: owner signed up via the website`, () => addComment(fc.id, `owner signed up via the website: ${s.email} · ${String(s.created_at).slice(0, 10)}`));
      }
    }
    // e858143: the hand-off line the coordinator engine, Escalate, Collect and File wait for, on the Find card of every consented
    // website sign-up, not only new ones (older sign-ups never got it). Once per case: a Find card already carrying a line has it.
    // The site offers no fee or appeal choices yet, so the defaults.
    const auth: string[] = [];
    for (const s of rowsS) {
      const fc = s.case_id ? findCard.get(s.case_id) : undefined;
      if (!fc || auth.includes(s.case_id) || texts(fc).some((t) => /^authorization:/m.test(t))) continue;
      auth.push(s.case_id);
      await write(`comment ${fc.id}: authorization: case_id ${s.case_id}`, () => addComment(fc.id, `authorization: case_id ${s.case_id} · scope vab_petition · fee none · partial_above none · reopen_risk no`));
    }
    // Website cards made before the from: line: the REST PATCH cannot rewrite a body, so the line goes on as the card's one comment.
    const froms: string[] = [];
    for (const c of signupCards) {
      const email = (c.body ?? '').match(/^email: *(\S+@\S+)/m)?.[1];
      if (!/^source: website$/m.test(c.body ?? '') || !email || texts(c).some((t) => /^from: /m.test(t))) continue;
      froms.push(c.id);
      await write(`comment ${c.id}: from: ${email}`, () => addComment(c.id, `from: ${email}`));
    }
    out.signups = { consented: rowsS.length, new: fresh, authorization_lines: auth.length, from_lines: froms.length };
  } catch (e) { errors.push(`signups: ${e}`); }

  // --- board -> cases.messages: mirror_board.mirror_messages() (a332f84) ---
  // A `Message ·` card's `sent: <date> · <messageId>` comment is a mail from us (body minus its `to:` line); a `message_id:` line on
  // the owner's `Sign up ·` card (body or comment) is a mail from the owner. Each entry carries the mail id: nothing is added twice.
  if (on('messages')) try {
    const known = new Set<string>([...cases.values()].flatMap((r) => (r.messages ?? []).map((e: any) => e.id).filter(Boolean)));
    const found: [string, any][] = [];
    for (const c of msgCards) {
      const caseId = lastPart(c.title);
      if (caseId === 'no case') continue;
      for (const x of cm.get(c.id) ?? []) {
        const m = (x.body ?? '').match(/^sent: \d{4}-\d{2}-\d{2} · (<[^>]+>)/);
        if (m) found.push([caseId, { id: m[1], at: x.created_at, from: 'claimos', text: (c.body ?? '').replace(/^to: .*\n/, '').trim() }]);
      }
    }
    for (const c of signupCards) {
      const caseId = caseOf(c);
      if (!caseId) continue;
      for (const t of texts(c)) {
        const mid = t.match(/^message_id: (<[^>]+>)/m)?.[1], at = t.match(/^date: (.+)$/m)?.[1] ?? '';
        if (!mid || known.has(mid) || found.some(([, e]) => e.id === mid)) continue;
        const text = await ownerText(mid);
        if (text) found.push([caseId, { id: mid, at, from: 'owner', text }]);
      }
    }
    const add = new Map<string, any[]>();
    for (const [caseId, e] of found) if (!known.has(e.id)) { known.add(e.id); add.set(caseId, [...(add.get(caseId) ?? []), e]); }
    let written = 0;
    for (const [caseId, es] of add) {
      const cur = cases.get(caseId);
      if (!cur || cur.owner_email === DEMO_OWNER) continue;   // no case row, or the demo seed's hand-written messages
      written += es.length;
      await write(`cases ${caseId}: +${es.length} message(s) ${es.map((e) => `${e.from} ${e.id}`).join(', ')}`, () =>
        db(`cases?case_id=eq.${encodeURIComponent(caseId)}`, { method: 'PATCH', body: JSON.stringify({ messages: [...(cur.messages ?? []), ...es] }) }));
    }
    out.messages = { on_board: found.length, written };
  } catch (e) { errors.push(`messages: ${e}`); }

  // --- (a) Sign up -> Evidence ---
  // signup.system.md: a mail owner's confirmation is the comment `owner_confirmed: yes <date>`; a website card's consent text
  // (`source: website` + `consent: True`) is the owner's confirmation. The coordinator never assigns the Find card, so we do:
  // a QUALIFIED Find card nobody holds gets assignee evidence + todo (assignment is what starts Evidence).
  if (on('evidence')) try {
    const started: string[] = [];
    for (const c of signupCards) {
      const body = c.body ?? '';
      const ok = texts(c).some((t) => /^owner_confirmed: yes/m.test(t)) || (/^source: website$/m.test(body) && /^consent: true$/im.test(body));
      const caseId = ok ? caseOf(c) : null, fc = caseId ? findCard.get(caseId) : undefined;
      if (!fc || !fc.title.startsWith('FL ') || fc.assignee || !/^QUALIFIED/i.test(fc.note ?? '') || started.includes(caseId!)) continue;
      started.push(caseId!);
      await write(`assign ${fc.id} (${caseId}) to evidence, todo`, () => patchCard(fc.id, { assignee: 'evidence', status: 'todo' }));
      await write(`comment ${fc.id}: evidence-started · ${c.id}`, () => addComment(fc.id, `evidence-started · ${c.id}`));
    }
    out.evidence = { started: started.length, cases: started };
  } catch (e) { errors.push(`evidence: ${e}`); }

  // --- (b) gap #6: Escalate/Collect owner updates -> Message cards ---
  // Escalate (escalate.mjs resultComment) writes on the `Waiting on` card:
  //   `escalate-result · <STATUS> · <code> · <messageId>` … `owner-update (<channel>, auto-send): <subject>: <body>`
  // Collect (collect.mjs cardWrites) writes on the `Collect · <address> · <case_id>` card:
  //   `collect-result · <STATUS> · <code> · <invoice>` … `owner-message (<channel>, auto-send): <subject>: <body>`
  // and, per live_collect.md 4g, `payment-link · <reference> · <url> · <payment_link_id>` (or `· unavailable · …`).
  // HANDOFF-ESCALATE.md "Telling the owner something": one `Message · <address> · <case_id>` card, assignee signup, todo,
  // body `to: <owner email>` then the text. Neither desk creates it, so one comes per such comment (key msg:<comment id>);
  // a comment whose text already went out on a Message card of the case (repeat reminders) gets none.
  if (on('owner')) try {
    const res = { found: 0, created: 0, existing: 0, no_email: 0, cards: [] as string[] };
    const sent = new Set(msgCards.map((c) => `${lastPart(c.title)}|${(c.body ?? '').replace(/^to: .*\n/, '').trim()}`));
    for (const src of sources) for (const x of cm.get(src.id) ?? []) {
      const body = x.body ?? '', first = lines(body)[0];
      let text: string | null = null;
      if (/^(escalate|collect)-result · /.test(first)) {
        const m = body.match(/^owner-(?:update|message) \([^)]*\): (.+?): (.+)$/m);
        if (m) text = `${m[1]}\n\n${m[2].trim()}`;
      } else {
        const m = first.match(/^payment-link · (\S+) · (https:\/\/\S+)/);
        if (m) text = `Your Claim OS invoice ${m[1]} can be paid online here: ${m[2]}\n\nNo other action is needed.`;
      }
      if (!text) continue;
      res.found++;
      const full = `${text}\n\n${PRIVATE}\nthe Claim OS team`;
      const j = caseBlock(src.body), caseId = /^FL-/.test(lastPart(src.title)) ? lastPart(src.title) : j?.case_id;
      if (!caseId) continue;
      if (sent.has(`${caseId}|${full}`)) { res.existing++; continue; }
      const email = cases.get(caseId)?.owner_email || signupEmail(caseId);
      if (!email) { res.no_email++; continue; }
      sent.add(`${caseId}|${full}`);
      // the title's middle part is the mail subject (signup: `Claim OS · <address>`), so it must not carry ` · `
      const addr = (cases.get(caseId)?.address || j?.property?.address || src.title.split(' · ').slice(-2, -1)[0] || '').replace(/\s*·\s*/g, ' ').replace(/\s+/g, ' ').trim();
      const made = await write(`add Message · ${addr} · ${caseId} to ${email} from ${x.id} (${first.slice(0, 60)})`, () =>
        addCard({ title: `Message · ${addr} · ${caseId}`, body: `to: ${email}\n\n${full}`, status: 'todo', assignee: 'signup', key: `msg:${x.id}` }));
      if (made) { res.cards.push(`${made.card.id}${made.created ? '' : ' (key existed)'} → ${email}`); if (made.created) res.created++; else res.existing++; }
    }
    out.owner = res;
  } catch (e) { errors.push(`owner: ${e}`); }

  // --- (c) File -> Chase: a petition actually submitted gets its `Waiting on county ·` card ---
  // live_File.md: after an actual submission File records the official receipt and confirmation number; the Chase contract
  // needs `case_id:` and `level: vab_petition` lines. A card saying nothing was filed (test, replay, held, submitted=false) gets none.
  if (on('waiting')) try {
    const res = { submitted: 0, created: 0, cards: [] as string[] };
    const waiting = new Set(board.filter((c) => /^(DEMO · )?Waiting on/.test(c.title)).map((c) => caseBlock(c.body)?.case_id ?? lastPart(c.title)));
    const RECEIPT = /\b(?:confirmation|receipt|petition)\s*(?:number|no\.?|#|id)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{3,})/i;
    const NOT_FILED = /submitted\s*[=:]\s*false|not (?:been |yet )?(?:filed|submitted|transmitted)|nothing (?:was )?(?:filed|submitted)|no (?:submission|receipt)|\btest\b|replay|dry.?run|\bhold:/i;
    for (const fc of fileCards) {
      const caseId = lastPart(fc.title);
      if (waiting.has(caseId)) continue;
      const proof = [fc.note ?? '', ...(cm.get(fc.id) ?? []).map((x) => x.body ?? '')].find((t) => RECEIPT.test(t) && !NOT_FILED.test(t));
      if (!proof) continue;
      res.submitted++;
      waiting.add(caseId);
      const find = findCard.get(caseId), block = rawBlock(find?.body ?? null) ?? rawBlock(fc.body), j = caseBlock(find?.body ?? null) ?? caseBlock(fc.body);
      const office = proof.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0];
      // Escalate reads `authorization:` from the Waiting on card itself (live_escalate.md 4a), so the Find card's line travels along
      const authLine = find && texts(find).map((t) => t.match(/^authorization:.*$/m)?.[0]).find(Boolean);
      const addr = fc.title.split(' · ').slice(1, -1).join(' ');
      const body = [`case_id: ${caseId}`, 'level: vab_petition', `petition: ${proof.match(RECEIPT)![1]} · filed per ${fc.id}`,
        ...(office ? [`follow_up: ${[j?.jurisdiction?.county, 'VAB clerk', office].filter(Boolean).join(' ')}, every 7 days, last chased never`] : []),
        ...(authLine ? [authLine] : []),
        ...(block ? ['', '```json', block, '```'] : [])].join('\n');
      const made = await write(`add Waiting on county · ${addr} · ${caseId} (blocked, key waiting:${caseId}${office ? `, follow_up ${office}` : ', no follow_up'})`, () =>
        addCard({ title: `Waiting on county · ${addr} · ${caseId}`, body, status: 'blocked', key: `waiting:${caseId}` }));
      if (made) { res.cards.push(made.card.id); if (made.created) res.created++; }
    }
    out.waiting = res;
  } catch (e) { errors.push(`waiting: ${e}`); }

  // --- (d) portal meetings -> board: booking's own signal, retried every pass. signalBooking skips rows the portal did not make
  // and past calls, and writes the call-booked comment only when its keyed card is new; it gets our board page, not a second read.
  // It writes directly, so a dry pass lists the calls it would make (skips included).
  if (on('meetings')) try {
    const since = new Date(Date.now() - 14 * 86400e3).toISOString();
    const ms = await db(`meetings?status=in.(confirmed,requested)&created_at=gte.${since}&select=id,email,slot,address,case_id,status,notes&order=created_at`) as any[];
    const res: Record<string, number> = { rows: ms.length, created: 0, exists: 0, skipped: 0 };
    for (const m of ms) try {
      const r = await write(`signalBooking meeting ${m.id} (${m.status}, case ${m.case_id ?? 'none'}, ${m.email})`, () =>
        signalBooking(m, { email: m.email, address: (m.case_id && cases.get(m.case_id)?.address) || m.address }, board));
      if (r) res[r]++;
    } catch (e) { errors.push(`meetings ${m.id}: ${e}`); }
    out.meetings = res;
  } catch (e) { errors.push(`meetings: ${e}`); }

  return { ...out, writes, errors, ms: Date.now() - t0 };
}
