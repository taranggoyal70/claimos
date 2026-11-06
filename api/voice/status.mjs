export function GET() {
  return Response.json({
    provider: 'naive',
    configured: Boolean(process.env.VETTA_API_KEY),
    source: process.env.VETTA_API_KEY ? 'vercel-env' : 'none',
    fallback: 'browser',
  }, {
    headers: { 'cache-control': 'no-store' },
  });
}

