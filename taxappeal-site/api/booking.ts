// GET /api/booking → {url, provider}: the calendar the portal's Book page embeds. url is BOOKING_URL, or null when unset or
// not a link (the page then keeps its own time picker). provider: cal (cal.com), calendly (calendly.com), else link.
export function GET() {
  const raw = process.env.BOOKING_URL?.trim() ?? '';
  const u = URL.canParse(raw) && /^https?:$/.test(new URL(raw).protocol) ? new URL(raw) : null;
  const provider = !u ? null : /(^|\.)cal\.com$/.test(u.hostname) ? 'cal' : /(^|\.)calendly\.com$/.test(u.hostname) ? 'calendly' : 'link';
  return Response.json({ url: u?.href ?? null, provider }, { headers: { 'cache-control': 'no-store' } });
}
