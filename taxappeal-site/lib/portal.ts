import { neon } from '@neondatabase/serverless';
import { db } from './lookup';

export type Doc = { name: string; kind: string; at: string; file_id?: string; url?: string; has_file?: boolean };
export type Msg = { at: string; from: 'claimos' | 'owner'; text: string };
export type Case = {
  case_id: string; address: string | null; unit: string | null; city: string | null; county: string | null;
  needs_from_owner: string | null; history: unknown[]; documents: Doc[]; messages: Msg[];
} & Record<string, unknown>;
type Signup = { email: string; address: string; city: string | null; zip: string | null; created_at: string; case_id: string | null };
type Meeting = { id: string; email: string; slot: string; status: string; address: string | null; case_id: string | null; name: string | null; notes: string | null };
type Owner = { signups: Omit<Signup, 'email'>[]; cases: Case[]; meetings: Omit<Meeting, 'email'>[] };

// A hung connection must reach the REST fallback too; 8 s still covers Neon waking from suspend.
const sql = () => neon(process.env.DATABASE_URL as string, { fetchOptions: { signal: AbortSignal.timeout(8000) } });

const COLS = 'case_id,address,unit,city,zip,county,owner_email,stage,status,county_value,requested_value,decided_value,annual_savings,filing_deadline,petition_number,hearing_date,needs_from_owner,stop_reason,history,documents,messages,updated_at';

// The owner's sign-ups, cases and meetings. A sign-up's case_id never grants access: anyone can sign up with any
// candidate address, and site-sync seeds every case with owner_email null until a person sets the owner.
// One SQL round trip straight to Neon when the app has DATABASE_URL; the REST proxy when it has none or that query fails.
export async function ownerData(email: string): Promise<Owner> {
  if (process.env.DATABASE_URL) {
    try { return await ownerSql(email); } catch (e) { console.error('ownerData: direct SQL failed, using the REST proxy', e); }
  }
  return ownerRest(email);
}

// Wakes the function and the database before the owner reaches the portal (GET /api/portal?warm=1).
export async function warm() {
  if (process.env.DATABASE_URL) { try { await sql()`select 1`; return; } catch {} }
  await db('cases?select=case_id&limit=1').catch(() => {});
}

// Same rows, order, columns and JSON as ownerRest. lower(x) = email is the match the REST filters make, and the
// left join brings each case's candidates.use (no foreign key links the tables, so REST needs a second request).
async function ownerSql(email: string): Promise<Owner> {
  const [row] = await sql()`
    select
      (select coalesce(json_agg(s order by s.created_at desc), '[]') from
        (select address, city, zip, created_at, case_id from signups where lower(email) = ${email}) s) as signups,
      (select coalesce(json_agg(c order by c.updated_at desc), '[]') from
        (select c.case_id, c.address, c.unit, c.city, c.zip, c.county, c.stage, c.status, c.county_value, c.requested_value,
                c.decided_value, c.annual_savings, c.filing_deadline, c.petition_number, c.hearing_date, c.needs_from_owner,
                c.stop_reason, coalesce(c.history, '[]') as history, coalesce(c.documents, '[]') as documents,
                coalesce(c.messages, '[]') as messages, c.updated_at, k.use
           from cases c left join candidates k on k.case_id = c.case_id where lower(c.owner_email) = ${email}) c) as cases,
      (select coalesce(json_agg(m order by m.slot), '[]') from
        (select id, slot, status, address, case_id, name, notes from meetings where lower(email) = ${email}) m) as meetings`;
  return row as Owner;
}

// ilike makes the email match case-insensitive; the filters remove what its "_" wildcard lets through.
async function ownerRest(email: string): Promise<Owner> {
  const enc = encodeURIComponent(email);
  // candidates has no foreign key to cases, so `use` waits on the case ids; sign-ups and meetings run alongside.
  const [signups, cases, meetings] = await Promise.all([
    (db(`signups?select=email,address,city,zip,created_at,case_id&email=ilike.${enc}&order=created_at.desc`) as Promise<Signup[]>)
      .then((rows) => rows.filter((s) => s.email.toLowerCase() === email).map(({ email, ...s }) => s)),
    (db(`cases?select=${COLS}&owner_email=ilike.${enc}&order=updated_at.desc`) as Promise<(Case & { owner_email: string | null })[]>).then(async (rows) => {
      const cases = rows.filter((c) => (c.owner_email ?? '').toLowerCase() === email)
        .map(({ owner_email, ...c }) => ({ ...c, history: c.history ?? [], documents: c.documents ?? [], messages: c.messages ?? [] }));
      // The candidate row's `use` tells the pages when the county's value is an estimate (possessory interests on public land).
      const ids = cases.map((c) => `"${encodeURIComponent(c.case_id)}"`).join(',');
      const uses = ids ? ((await db(`candidates?select=case_id,use&case_id=in.(${ids})`)) as { case_id: string; use: string | null }[]) : [];
      for (const c of cases) c.use = uses.find((u) => u.case_id === c.case_id)?.use ?? null;
      return cases;
    }),
    (db(`meetings?select=id,email,slot,status,address,case_id,name,notes&email=ilike.${enc}&order=slot.asc`) as Promise<Meeting[]>)
      .then((rows) => rows.filter((m) => m.email.toLowerCase() === email).map(({ email, ...m }) => m)),
  ]);
  return { signups, cases, meetings };
}
