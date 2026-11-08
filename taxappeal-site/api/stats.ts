import { db, fail } from '../lib/lookup';

// Proof-strip numbers for the home page. The candidates table only holds flagged homes, not every home
// screened, so "homes" is the size of our list; the page labels it that way.
export async function GET() {
  try {
    const rows = (await db('candidates?select=county,tier,run_id')) as { county: string | null; tier: string | null; run_id: string | null }[];
    const run = rows.map((r) => r.run_id ?? '').sort().at(-1)?.match(/(\d{4})(\d{2})(\d{2})T/);
    return Response.json({
      counties: new Set(rows.map((r) => r.county).filter(Boolean)).size,
      homes: rows.length,
      cases: rows.filter((r) => r.tier === 'strong').length,
      run_date: run ? `${run[1]}-${run[2]}-${run[3]}` : null,
    }, { headers: { 'cache-control': 'public, max-age=3600' } });
  } catch (e) { return fail(e); }
}
