const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav = document.querySelector('.nav-in');
if (nav) {
  const links = nav.querySelector('.nav-links');
  if (links) {
    if (!links.querySelector('[href="/workflow"]')) {
      const real = document.createElement('a'); real.href='/workflow'; real.textContent='Real workflow'; links.append(real);
    }
    links.id = 'site-navigation';
    const menu = document.createElement('button');
    menu.className = 'menu-toggle';
    menu.textContent = 'Menu';
    menu.setAttribute('aria-controls', links.id);
    menu.setAttribute('aria-expanded', 'false');
    const close = () => { nav.classList.remove('menu-open'); menu.setAttribute('aria-expanded', 'false'); };
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('menu-open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelector('.nav-end').prepend(menu);
    links.addEventListener('click', close);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }
}

const model = document.querySelector('.recovery-model');
if (model && !reduced) {
  let step = 0;
  let visible = true;
  const stages = [
    ['Qualified', 'Eligibility Agent', 'Evidence and economics verified'],
    ['Evidence ready', 'Evidence Agent', '4 exhibits linked to their sources'],
    ['Owner review', 'Filing Agent', 'Packet prepared. Authorization required.'],
  ];
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(model);
  setInterval(() => {
    if (!visible || document.hidden) return;
    step = (step + 1) % stages.length;
    const [status, agent, action] = stages[step];
    model.dataset.stage = step;
    model.querySelector('[data-model-status]').textContent = status;
    model.querySelector('[data-model-agent]').textContent = agent;
    model.querySelector('[data-model-action]').textContent = action;
    model.querySelectorAll('[data-model-step]').forEach((node, i) => node.classList.toggle('active', i <= step));
  }, 3800);
}

if (!reduced && !document.body.classList.contains('live-body')) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('surface-arrived'); observer.unobserve(entry.target); }
  }), { threshold: .06 });
  document.querySelectorAll('.ops-grid,.desks-table,.proof-page-grid,.intake-stage,.qualify-panel,.dossier-layout').forEach(el => {
    el.classList.add('surface-enter'); observer.observe(el);
  });
}
