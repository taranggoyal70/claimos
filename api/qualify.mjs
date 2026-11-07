import { runQualifyDemo } from '../lib/qualify-demo.mjs';

export async function GET() {
  return Response.json(await runQualifyDemo(), { headers: { 'cache-control': 'no-store' } });
}
