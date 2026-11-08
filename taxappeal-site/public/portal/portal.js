/* Portal runtime for /portal (the overview). The other portal pages inline their own copy of the token flow.
     <script src="/portal/portal.js"></script> then Portal.load(render)
   Portal.load(render): reads ?t= (moves it into sessionStorage.claimos_t and off the address bar), renders at once from
     the last payload for that token (sessionStorage.claimos_portal {t, at, data}) or shows a skeleton card, then calls
     GET /api/portal?t= and calls render(data) again only when the answer differs, so render must be safe to repeat.
     data is {email, cases, signups, meetings}. No token, or a 200 {error: 'expired'}
     (a 4xx would log a console line), shows the "sign in by email" card; any other failure shows the "could not reach
     our records" card. Both go into [data-portal].
   Page markup it expects: <span class="nav-who" hidden>Signed in as <b data-email></b></span>,
     <a href="/track" data-signout hidden>Sign out</a>, <main class="wrap portal" data-portal aria-live="polite">.
   Helpers (elements or strings, never HTML): money date when title addr place closed chip nextAction emptyCard
     sortCases el mailto PROP doc. */
window.Portal = (() => {
  const KEY = 'claimos_t', CACHE = 'claimos_portal';
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const store = { get: (k = KEY) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (v, k = KEY) => { try { sessionStorage.setItem(k, v); } catch {} }, clear: () => { try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(CACHE); } catch {} } };

  const money = (n) => (n == null || isNaN(Number(n)) ? '—' : '$' + Math.round(Number(n)).toLocaleString('en-US'));
  const date = (s) => (s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  // Meeting slots are Eastern whatever the viewer's clock says; a Calendly booking saves no slot, the invite has the time
  const when = (s) => !s ? 'Booked · time in your calendar invite' : new Date(s).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET';
  // The roll's upper-case addresses with doubled spaces → "4220 NW 13th St"
  const title = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).replace(/\b(N[ew]|S[ew])\b/g, (m) => m.toUpperCase());
  const addr = (c) => title(c.address) + (c.unit ? `, Unit ${c.unit}` : '');
  const place = (c) => [c.city && title(c.city), c.county && c.county + ' County'].filter(Boolean).join(' · ');
  const closed = (c) => c.stage === 'stopped' || c.status === 'stopped';
  const PROP = (c) => '/portal/property?id=' + encodeURIComponent(c.case_id);
  // A case document's link: its own url, else /api/doc signs the file on click (has_file), else null ("on file")
  const doc = (c, x) => x.url || (x.has_file ? `/api/doc?t=${encodeURIComponent(store.get() || '')}&case=${encodeURIComponent(c.case_id)}&i=${c.documents.indexOf(x)}` : null);
  const mailto = (subject) => 'mailto:hello@claim-os-d4myby.usenaive.ai?subject=' + encodeURIComponent(subject);

  const CHIP = { find: ['Checking', 'gray'], qualify: ['Checking', 'gray'], signup: ['Signed up', 'amber'], evidence: ['Evidence', 'amber'], file: ['Filing', 'amber'],
    waiting: ['Waiting on county', ''], appeal: ['Second round', ''], won: ['Won', 'green'], stopped: ['Closed', 'gray'] };
  const NEXT = { find: 'We are checking the parcel.', qualify: 'We are checking the parcel.', signup: 'We confirm the parcel and send the agreement.',
    evidence: 'We assemble the evidence packet.', file: "We file the petition before the county's deadline.", waiting: 'Nothing to do. The county sets the hearing; we attend.',
    appeal: 'We decide the second round with you.', won: "Our invoice follows the county's corrected bill.", stopped: 'Nothing. You owe nothing.' };

  // On a won case the board mirror puts Collect's note in status: 'invoice' once sent, 'paid' once Stripe confirms.
  const BILL = { invoice: ['Invoice sent', "Pay the invoice; it follows the county's corrected bill."], paid: ['Paid', 'Nothing. Paid in full, thank you.'] };
  const bill = (c) => (c.stage === 'won' && BILL[c.status]) || null;
  const chip = (c) => {
    const [text, tone] = c.needs_from_owner && !closed(c) ? ['Needs you', 'amber'] : bill(c) ? [bill(c)[0], 'green'] : CHIP[closed(c) ? 'stopped' : c.stage] || CHIP.find;
    const b = el('span', 'badge', text);
    if (tone) b.dataset.tone = tone;
    return b;
  };
  const nextAction = (c) => (c.needs_from_owner && !closed(c) ? c.needs_from_owner : bill(c) ? bill(c)[1] : NEXT[closed(c) ? 'stopped' : c.stage] || NEXT.find);

  // Needs you first, then active by freshness, won, stopped last
  const rank = (c) => (closed(c) ? 3 : c.stage === 'won' ? 2 : c.needs_from_owner ? 0 : 1);
  const sortCases = (cases) => [...cases].sort((a, b) => rank(a) - rank(b) || String(b.updated_at || '').localeCompare(String(a.updated_at || '')));

  const emptyCard = (d) => {
    const card = el('div', 'card step'), s = (d.signups || [])[0], pills = el('div', 'pills');
    if (s) {
      card.append(el('h2', null, 'Nothing yet.'), el('p', null, `We have your sign-up for ${title(s.address)}${s.city ? ', ' + title(s.city) : ''}${s.zip ? ' ' + s.zip : ''}` +
        (d.signups.length > 1 ? ` and ${d.signups.length - 1} more` : '') + ' and are checking the parcel against the county roll by hand; this page fills in as we go.'));
    } else {
      card.append(el('h2', null, 'Nothing under this email yet.'), el('p', null, `We have no sign-up or case for ${d.email}. If you used a different email, request a new link with it.`));
      const a = el('a', 'pill', 'Request a new link'); a.href = '/track'; pills.append(a);
    }
    const chk = el('a', 'pill', 'Check another address'); chk.href = '/check'; pills.append(chk);
    card.append(pills);
    return card;
  };

  const notice = (h, p, btnText, href) => {
    const card = el('div', 'card step'), head = el('h2', null, h), pills = el('div', 'pills'), a = el('a', 'btn', btnText);
    head.tabIndex = -1; a.href = href; pills.append(a);
    card.append(head, el('p', null, p), pills);
    return card;
  };

  async function load(render) {
    const main = document.querySelector('[data-portal]');
    const show = (card) => { document.body.classList.add('is-out'); main.replaceChildren(card); main.removeAttribute('aria-busy'); card.querySelector('h2').focus({ preventScroll: true }); };
    const u = new URL(location.href), t = u.searchParams.get('t');
    if (t) { store.set(t); u.searchParams.delete('t'); history.replaceState(null, '', u.pathname + u.search + u.hash); }
    const tok = store.get();
    if (!tok) return show(notice('Sign in by email.', 'We email you a link that opens your properties. It works for 24 hours.', 'Email me a link', '/track'));
    let cached = null;
    try { const c = JSON.parse(store.get(CACHE)); if (c && c.t === tok) cached = c; } catch {}
    const skel = el('div', 'card step skel');
    const paint = (d) => {
      skel.remove();
      document.querySelectorAll('[data-email]').forEach((e) => { e.textContent = d.email; });
      document.querySelectorAll('.nav-who, [data-signout]').forEach((e) => { e.hidden = false; });
      render(d);
      main.removeAttribute('aria-busy');
    };
    if (cached) paint(cached.data);
    else { skel.setAttribute('aria-hidden', 'true'); skel.append(el('i'), el('i'), el('i')); main.prepend(skel); }
    let d;
    // With a cached copy on screen, skip the HTTP cache: a booking or message sent a moment ago must show up
    try { const r = await fetch('/api/portal?t=' + encodeURIComponent(tok), cached ? { cache: 'no-cache' } : {}); d = r.ok ? await r.json() : null; } catch { d = null; }
    if (!d) return cached ? undefined : show(notice('We could not reach our records.', 'Please reload to try again, or email hello@claim-os-d4myby.usenaive.ai and we answer by hand.', 'Reload', location.href));
    if (d.error === 'expired') { store.clear(); return show(notice('That link has expired.', 'Links work for 24 hours. Request a new one and we email it within a minute.', 'Email me a new link', '/track')); }
    store.set(JSON.stringify({ t: tok, at: Date.now(), data: d }), CACHE);
    if (cached && JSON.stringify(cached.data) === JSON.stringify(d)) return;
    paint(d);
    if (!cached) main.classList.add('rise');
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-signout]')) store.clear(); });

  return { load, doc, el, money, date, when, title, addr, place, closed, chip, nextAction, emptyCard, sortCases, mailto, PROP };
})();
