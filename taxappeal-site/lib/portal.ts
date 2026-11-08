import { db } from './lookup';

export type Doc = { name: string; kind: string; at: string; file_id?: string; url?: string };
export type Msg = { at: string; from: 'claimos' | 'owner'; text: string };
export type Case = {
  case_id: string; address: string | null; unit: string | null; city: string | null; county: string | null;
  needs_from_owner: string | null; history: unknown[]; documents: Doc[]; messages: Msg[];
} & Record<string, unknown>;
type Signup = { email: string; address: string; city: string | null; zip: string | null; created_at: string; case_id: string | null };

const COLS = 'case_id,address,unit,city,zip,county,owner_email,stage,status,county_value,requested_value,decided_value,annual_savings,filing_deadline,petition_number,hearing_date,needs_from_owner,stop_reason,history,documents,messages,updated_at';

// The owner's sign-ups, and the cases carrying their email. A sign-up's case_id never grants access: anyone can sign
// up with any candidate address, and site-sync seeds every case with owner_email null until a person sets the owner.
// ilike makes the email match case-insensitive; the filters remove what its "_" wildcard lets through.
export async function ownerData(email: string) {
  const enc = encodeURIComponent(email);
  const signups = ((await db(`signups?select=email,address,city,zip,created_at,case_id&email=ilike.${enc}&order=created_at.desc`)) as Signup[])
    .filter((s) => s.email.toLowerCase() === email);
  const cases = ((await db(`cases?select=${COLS}&owner_email=ilike.${enc}&order=updated_at.desc`)) as (Case & { owner_email: string | null })[])
    .filter((c) => (c.owner_email ?? '').toLowerCase() === email)
    .map(({ owner_email, ...c }) => ({ ...c, history: c.history ?? [], documents: c.documents ?? [], messages: c.messages ?? [] }));
  // The candidate row's `use` tells the pages when the county's value is an estimate (possessory interests on public land).
  const ids = cases.map((c) => `"${encodeURIComponent(c.case_id)}"`).join(',');
  const uses = ids ? ((await db(`candidates?select=case_id,use&case_id=in.(${ids})`)) as { case_id: string; use: string | null }[]) : [];
  for (const c of cases) c.use = uses.find((u) => u.case_id === c.case_id)?.use ?? null;
  return { signups: signups.map(({ email, ...s }) => s), cases };
}
