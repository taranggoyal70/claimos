// The app's managed database speaks PostgREST; the platform hands the app its URL and service key.
const REST = (process.env.DATABASE_REST_URL as string).replace(/\/$/, '');
const KEY = process.env.DATABASE_SERVICE_KEY as string;

export type Candidate = {
  case_id: string; address: string; unit: string | null; city: string | null; zip: string; addr_key: string; tier: string; use: string | null;
  just_value: string | number; defensible_value: string | number; annual_savings: string | number; run_id: string | null;
};

export async function db(path: string, init: { method?: string; body?: string } = {}) {
  const r = await fetch(`${REST}/${path}`, {
    ...init,
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'return=representation' },
  });
  if (!r.ok) throw new Error(`db ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// Exact row count from the Content-Range header: a plain read returns at most 1,000 rows, whatever `limit` says.
export async function count(path: string) {
  const r = await fetch(`${REST}/${path}`, { method: 'HEAD', headers: { apikey: KEY, authorization: `Bearer ${KEY}`, prefer: 'count=exact' } });
  const total = r.headers.get('content-range')?.split('/')[1] ?? '';
  if (!r.ok || !/^\d+$/.test(total)) throw new Error(`db count ${r.status}: ${path}`);
  return Number(total);
}

// One JSON error shape for both handlers instead of a bare platform 500.
export function fail(e: unknown) {
  console.error(e);
  return Response.json({ error: 'database_error', detail: String(e) }, { status: 500 });
}

// Same normalisation as candidates.addr_key: upper(collapse spaces(trim(address))) || '|' || zip
export function addrKey(address: string, zip: string) {
  return address.trim().replace(/\s+/g, ' ').toUpperCase() + '|' + zip.trim();
}

const unitKey = (u: string | null | undefined) => (u ?? '').replace(/^\s*(#|unit|apt)\s*/i, '').trim().toUpperCase();
const SELECT = 'select=case_id,address,unit,city,zip,addr_key,tier,use,just_value,defensible_value,annual_savings,run_id';

// A letter's claim code (taxappeal-site-sync/letters.py) names the case outright: no address typing, no unit picker.
export async function findByCode(code: string): Promise<Candidate | null> {
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) return null;
  const [cc] = (await db(`claim_codes?code=eq.${code}&select=case_id`)) as { case_id: string }[];
  if (!cc) return null;
  const rows = (await db(`candidates?case_id=eq.${encodeURIComponent(cc.case_id)}&${SELECT}`)) as Candidate[];
  return rows[0] ?? null;
}

// People type "YC Office, 560 20th St., San Francisco, CA": the first "<number> <word>" in the text is the house and street.
const houseStreet = (address: string) => address.toUpperCase().replace(/[.,#]/g, ' ').match(/(?:^|\s)(\d+)\s+(\S+)/)?.slice(1, 3) ?? [];

// zip + house number narrow the rows; exact addr_key wins, else the first street token must appear.
// A wrong ZIP falls back to the house number alone when exactly one address (or the city typed) matches.
// Condo buildings share one addr_key with a row per unit: without a unit that pick returns the whole list.
export async function findCandidate(address: string, zip: string, unit = ''): Promise<Candidate | Candidate[] | null> {
  const key = addrKey(address, zip);
  const [house, street] = houseStreet(address);
  if (!house || !street) return null;
  const like = `addr_key=like.${encodeURIComponent(house + ' *')}`;
  const onStreet = (rows: Candidate[]) => rows.filter((r) => r.addr_key.split('|')[0].split(' ').includes(street));
  let hits: Candidate[] = [];
  if (/^\d{5}$/.test(zip.trim())) {
    const rows = (await db(`candidates?${SELECT}&zip=eq.${zip.trim()}&${like}&order=imported_at.desc`)) as Candidate[];
    const exact = rows.filter((r) => r.addr_key === key);
    hits = exact.length ? exact : onStreet(rows);
  }
  if (!hits.length) {
    const any = onStreet((await db(`candidates?${SELECT}&${like}&order=imported_at.desc&limit=200`)) as Candidate[]);
    const typed = address.toUpperCase();
    const groups = [...new Set(any.map((r) => r.addr_key))];
    const pick = groups.length === 1 ? groups[0] : groups.find((k) => any.some((r) => r.addr_key === k && r.city && typed.includes(r.city.toUpperCase())));
    hits = pick ? any.filter((r) => r.addr_key === pick) : [];
  }
  if (unitKey(unit)) return hits.find((r) => unitKey(r.unit) === unitKey(unit)) ?? (hits.length === 1 ? hits[0] : null);
  if (hits.length > 1 && new Set(hits.map((r) => r.addr_key)).size === 1) return hits;
  return hits[0] ?? null;
}
