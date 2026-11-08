import { db } from './lookup';

export type Doc = { name: string; kind: string; at: string; file_id?: string; url?: string };
export type Msg = { at: string; from: 'claimos' | 'owner'; text: string };
export type Case = {
  case_id: string; address: string | null; unit: string | null; city: string | null; county: string | null;
  needs_from_owner: string | null; history: unknown[]; documents: Doc[]; messages: Msg[];
} & Record<string, unknown>;
type Signup = { email: string; address: string; city: string | null; zip: string | null; created_at: string; case_id: string | null };

const COLS = 'case_id,address,unit,city,zip,county,owner_email,stage,status,county_value,requested_value,decided_value,annual_savings,filing_deadline,petition_number,hearing_date,needs_from_owner,stop_reason,history,documents,messages,updated_at';
const quote = (s: string) => encodeURIComponent(`"${s.replace(/"/g, '\\"')}"`); // case_ids carry spaces: PostgREST in.() wants them quoted

// The owner's sign-ups and cases: cases carrying their email, plus those their sign-ups point at (as /api/track).
// ilike makes the email match case-insensitive; the filters remove what its "_" wildcard lets through.
export async function ownerData(email: string) {
  const enc = encodeURIComponent(email);
  const signups = ((await db(`signups?select=email,address,city,zip,created_at,case_id&email=ilike.${enc}&order=created_at.desc`)) as Signup[])
    .filter((s) => s.email.toLowerCase() === email);
  const ids = signups.map((s) => s.case_id).filter((id): id is string => Boolean(id));
  const or = [`owner_email.ilike.${enc}`, ids.length && `case_id.in.(${ids.map(quote).join(',')})`].filter(Boolean).join(',');
  const cases = ((await db(`cases?select=${COLS}&or=(${or})&order=updated_at.desc`)) as (Case & { owner_email: string | null })[])
    .filter((c) => ids.includes(c.case_id) || (c.owner_email ?? '').toLowerCase() === email)
    .map(({ owner_email, ...c }) => ({ ...c, history: c.history ?? [], documents: c.documents ?? [], messages: c.messages ?? [] }));
  return { signups: signups.map(({ email, ...s }) => s), cases };
}
