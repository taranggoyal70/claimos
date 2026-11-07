import { claimBeats, caseRecord, money } from './demo-data.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function setupTheme() {
  const button = $('[data-theme-toggle]');
  const label = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    button.textContent = dark ? 'Light' : 'Dark';
    button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  };
  button.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('gcm-theme', dark ? 'light' : 'dark'); } catch {}
    dispatchEvent(new Event('themechange'));
    label();
  });
  label();
}

function splitWords(element) {
  let index = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { fragment.append(' '); return; }
          const mask = document.createElement('span');
          mask.className = 'word-mask';
          const word = document.createElement('span');
          word.textContent = part;
          word.style.setProperty('--word-index', index++);
          mask.append(word);
          fragment.append(mask);
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(element);
  element.classList.add('split');
}

function setupChrome() {
  const nav = $('#nav');
  const thread = document.createElement('div');
  thread.className = 'nav-thread';
  thread.setAttribute('aria-hidden', 'true');
  thread.innerHTML = '<i></i><b></b>';
  nav.append(thread);

  $$('[data-split]').forEach(splitWords);

  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      reveal.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((element) => reveal.observe(element));

  const links = $$('.nav-links a').filter(link => link.getAttribute('href').startsWith('#'));
  const sections = links.map((link) => $(link.getAttribute('href')));
  let queued = false;
  const update = () => {
    queued = false;
    nav.classList.toggle('solid', scrollY > 24);
    const max = document.documentElement.scrollHeight - innerHeight;
    thread.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
    const readingLine = innerHeight * 0.4;
    let current = -1;
    sections.forEach((section, index) => { if (section?.getBoundingClientRect().top < readingLine) current = index; });
    links.forEach((link, index) => link.classList.toggle('on', index === current));
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  addEventListener('resize', update);
  update();
}

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function setupClaimField(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { width: 0, height: 0, dpr: 1 };
  let colors = {};
  let frame = 0;
  let visible = true;
  const epoch = performance.now();
  const records = Array.from({ length: 18 }, (_, index) => ({
    x: 0.08 + ((index * 47) % 87) / 100,
    y: 0.12 + ((index * 29) % 73) / 100,
    phase: index * 0.53,
    weight: index % 5 === 0 ? 1 : 0,
  }));

  const readColors = () => {
    colors = {
      ink: token('--ink'),
      faint: token('--faint'),
      line: token('--rule-2'),
      registry: token('--registry'),
      recovery: token('--recovery'),
      paper: token('--paper'),
    };
  };

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    view.width = box.width;
    view.height = box.height;
    view.dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = box.width * view.dpr;
    canvas.height = box.height * view.dpr;
  };

  const draw = (now) => {
    const { width: W, height: H, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const t = reducedMotion ? 0.72 : (((now - epoch) % 14000) / 14000);
    const focusX = W * 0.82;
    const focusY = H * 0.34;

    records.forEach((record, index) => {
      const drift = Math.sin(now / 1700 + record.phase) * 8;
      const progress = Math.max(0, Math.min(1, (t * 1.3 - index / records.length * 0.38)));
      const ease = 1 - Math.pow(1 - progress, 3);
      const startX = record.x * W;
      const startY = record.y * H;
      const x = startX + (focusX - startX) * ease;
      const y = startY + (focusY - startY) * ease + drift * (1 - ease);
      const size = record.weight ? 8 : 5;
      ctx.globalAlpha = 0.12 + progress * 0.45;
      ctx.strokeStyle = progress > 0.78 ? colors.recovery : colors.faint;
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      if (progress > 0.45) {
        ctx.globalAlpha = progress * 0.15;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(focusX, focusY);
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 0.92;
    if (W > 850) {
      const formed = Math.max(0, Math.min(1, (t - 0.08) / 0.18));
      const dossierW = 218;
      const dossierH = 140;
      const x = focusX - dossierW / 2;
      const y = focusY - dossierH / 2;
      ctx.save();
      ctx.translate(focusX, focusY);
      ctx.scale(0.82 + formed * 0.18, 0.82 + formed * 0.18);
      ctx.translate(-focusX, -focusY);
      ctx.fillStyle = colors.paper;
      ctx.strokeStyle = colors.faint;
      ctx.lineWidth = 1;
      ctx.fillRect(x + 15, y - 12, dossierW, dossierH);
      ctx.strokeRect(x + 15, y - 12, dossierW, dossierH);
      ctx.fillRect(x + 7, y - 6, dossierW, dossierH);
      ctx.strokeRect(x + 7, y - 6, dossierW, dossierH);
      ctx.strokeStyle = colors.recovery;
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, dossierW, dossierH);
      ctx.strokeRect(x, y, dossierW, dossierH);
      ctx.fillStyle = colors.ink;
      ctx.textAlign = 'left';
      ctx.font = '500 9px "IBM Plex Mono", monospace';
      ctx.fillText('CLAIM DOSSIER · PT-2026-11847', x + 16, y + 21);
      ctx.globalAlpha = 0.34 + formed * 0.5;
      ctx.fillStyle = colors.faint;
      ctx.fillRect(x + 16, y + 35, dossierW - 32, 1);
      ctx.fillRect(x + 16, y + 53, 94, 5);
      ctx.fillRect(x + 16, y + 69, 146, 5);
      ctx.globalAlpha = formed;
      ctx.fillStyle = colors.recovery;
      ctx.font = '500 32px "Instrument Sans", sans-serif';
      ctx.fillText('$1,018', x + 16, y + 115);
      ctx.fillStyle = colors.ink;
      ctx.font = '500 9px "IBM Plex Mono", monospace';
      ctx.fillText('POTENTIAL ANNUAL RECOVERY', x + 116, y + 111);
      ctx.restore();
    } else {
      ctx.fillStyle = colors.paper;
      ctx.strokeStyle = colors.recovery;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(focusX, focusY, 19 + Math.sin(now / 800) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = colors.ink;
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$1,018', focusX, focusY + 4);
    }
    ctx.globalAlpha = 1;

    if (visible && !reducedMotion) frame = requestAnimationFrame(draw);
  };

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !frame) frame = requestAnimationFrame(draw);
    if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
  }).observe(canvas);
  addEventListener('themechange', readColors);
  readColors();
  resize();
  frame = requestAnimationFrame(draw);

  const recordsOut = $('[data-records]');
  const casesOut = $('[data-cases]');
  const start = performance.now();
  const count = (now) => {
    const p = reducedMotion ? 1 : Math.min(1, (now - start) / 2600);
    const eased = 1 - Math.pow(1 - p, 3);
    recordsOut.textContent = Math.round(218431 * eased).toLocaleString();
    casesOut.textContent = p > 0.78 ? '1' : '0';
    $('.exchange-runner')?.style.setProperty('--runner', `${4 + eased * 92}%`);
    if (p < 1) requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
}

function setupExchangeTape() {
  const recordsOut = $('[data-records]');
  const casesOut = $('[data-cases]');
  const runner = $('.exchange-runner');
  if (!recordsOut || !casesOut || !runner) return;
  const start = performance.now();
  const tick = (now) => {
    const progress = reducedMotion ? 1 : Math.min(1, (now - start) / 2600);
    const eased = 1 - Math.pow(1 - progress, 3);
    recordsOut.textContent = Math.round(218431 * eased).toLocaleString();
    casesOut.textContent = progress > 0.76 ? '1' : '0';
    runner.style.setProperty('--runner', `${4 + eased * 92}%`);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setupMechanism() {
  const figure = $('#mechanism-figure');
  const source = $('.source-document', figure);
  const sheet = $('.dossier-sheet', figure);
  const svg = $('.provenance', figure);
  let run = 0;

  const connector = (from, to, index) => {
    const stage = $('.mechanism-stage', figure).getBoundingClientRect();
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const x1 = a.right - stage.left;
    const y1 = a.top + a.height / 2 - stage.top;
    const x2 = b.left - stage.left;
    const y2 = b.top + b.height / 2 - stage.top;
    const c = Math.max(38, (x2 - x1) * 0.45);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`);
    const length = path.getTotalLength?.() || 320;
    path.style.setProperty('--length', length);
    path.style.transitionDelay = `${index * 160 + 150}ms`;
    svg.append(path);
    requestAnimationFrame(() => path.classList.add('drawn'));
  };

  const play = async () => {
    const id = ++run;
    source.classList.remove('play');
    $$('[data-slot]', sheet).forEach((row) => row.classList.remove('arrived'));
    svg.innerHTML = '';
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : 220));
    if (id !== run) return;
    source.classList.add('play');
    const fields = ['property', 'value', 'deadline'];
    for (let index = 0; index < fields.length; index++) {
      const field = fields[index];
      await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : 440));
      if (id !== run) return;
      const row = $(`[data-slot="${field}"]`, sheet);
      row.classList.add('arrived');
      connector($(`[data-field="${field}"]`, source), row, index);
    }
    for (const field of ['recovery', 'next']) {
      await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : 360));
      if (id !== run) return;
      $(`[data-slot="${field}"]`, sheet).classList.add('arrived');
    }
  };

  $('[data-mechanism-replay]').addEventListener('click', play);
  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    play();
  }, { rootMargin: '0px 0px -18% 0px' }).observe(figure);
  addEventListener('resize', () => { if (source.classList.contains('play')) play(); });
}

function artifactsFor(index) {
  const rows = [
    ['SOURCE', 'Assessment roll scanned', '218,431 records'],
    ['DECISION', 'Eligibility and expected value', '$713 EV'],
    ['VOICE', 'Claimant consent and facts', '05:27 call'],
    ['E-01', 'Assessment + comparable evidence', '4 exhibits'],
    ['CAPITAL', 'Case funded; weak case rejected', '$18.40 cost'],
    ['APPROVAL', 'Filing-ready packet held', '1 human act'],
    ['RECEIPT', 'Packet delivered; follow-up active', '$49 revenue'],
  ];
  return rows.slice(0, index + 1);
}

function setupRecovery() {
  const root = $('#recovery-replay');
  root.style.setProperty('--beats', claimBeats.length);
  const track = $('.recovery-track', root);
  track.innerHTML = claimBeats.map((beat, index) => `<button type="button" class="beat-node" data-label="${beat.label}" data-index="${index}" style="left:${((index + 0.5) / claimBeats.length) * 100}%" aria-label="Beat ${index + 1}: ${beat.title}"></button>`).join('');

  const title = $('.recovery-copy h3', root);
  const number = $('.recovery-number', root);
  const summary = $('.recovery-summary', root);
  const source = $('.recovery-source', root);
  const value = $('[data-case-value]', root);
  const actor = $('[data-case-actor]', root);
  const actorName = $('[data-agent-name]', root);
  const actorStatus = $('[data-agent-status]', root);
  const beatState = $('[data-beat-state]', root);
  const artifacts = $('.artifact-stack', root);
  const mini = $('.money-trail-mini', root);
  let current = -1;

  const render = (index, animate = true) => {
    if (index === current) return;
    current = index;
    const beat = claimBeats[index];
    number.textContent = String(index + 1).padStart(2, '0');
    title.textContent = beat.title;
    title.classList.toggle('roll', animate && !reducedMotion);
    if (animate && !reducedMotion) {
      title.getAnimations().forEach((animation) => animation.cancel());
      void title.offsetWidth;
      title.classList.remove('roll');
      requestAnimationFrame(() => title.classList.add('roll'));
    }
    summary.textContent = beat.summary;
    source.textContent = beat.source;
    value.textContent = beat.value;
    actor.textContent = beat.actor;
    actorName.textContent = beat.actor;
    actorStatus.textContent = beat.state === 'approval' ? 'waiting on a person' : beat.state === 'filed' ? 'follow-up scheduled' : 'working';
    beatState.textContent = beat.state;
    mini.style.setProperty('--stage-progress', `${((index + 1) / claimBeats.length) * 100}%`);
    track.style.setProperty('--progress', `${((index + 0.5) / claimBeats.length) * 100}%`);
    $$('.beat-node', track).forEach((node, nodeIndex) => {
      node.classList.toggle('past', nodeIndex < index);
      node.classList.toggle('now', nodeIndex === index);
    });
    artifacts.innerHTML = artifactsFor(index).slice(-3).map(([tag, label, detail]) => `<div class="artifact"><span class="tag">${tag}</span><strong>${label}</strong><small>${detail}</small></div>`).join('');
  };

  const beatFromScroll = () => {
    const box = root.getBoundingClientRect();
    const span = box.height - innerHeight;
    const progress = span > 0 ? Math.max(0, Math.min(1, -box.top / span)) : 0;
    return Math.min(claimBeats.length - 1, Math.floor(progress * claimBeats.length));
  };
  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(beatFromScroll()); });
  }, { passive: true });

  track.addEventListener('click', (event) => {
    const button = event.target.closest('.beat-node');
    if (!button) return;
    const index = Number(button.dataset.index);
    const box = root.getBoundingClientRect();
    const span = box.height - innerHeight;
    scrollTo({ top: scrollY + box.top + ((index + 0.5) / claimBeats.length) * span, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
  render(beatFromScroll(), false);
}

function setupProof() {
  const detail = $('.proof-detail');
  const copy = {
    scan: ['218,431 source records', 'The scanner ranked properties by over-assessment, filing eligibility, available evidence and expected return. Every candidate keeps the source row and calculation.'],
    time: ['4 minutes 12 seconds', 'From confirmed claimant facts to a filing-ready dossier with four verified exhibits, valuation math and the owner authorization boundary.'],
    autonomy: ['31 decisions · 1 human act', 'Agents selected the case, gathered sources, called the claimant, built evidence, allocated budget and prepared filing. The owner authorized the consequential action.'],
    revenue: ['$49 sample deposit', 'The replay illustrates an analysis deposit. No payment is processed here. A success fee would depend on verified recovery.'],
  };
  $$('.proof-row').forEach((button) => {
    const show = () => {
      $$('.proof-row').forEach((item) => item.classList.toggle('active', item === button));
      const [label, text] = copy[button.dataset.proof];
      detail.innerHTML = `<span class="mono">${label}</span><p>${text}</p>`;
    };
    button.addEventListener('mouseenter', show);
    button.addEventListener('focus', show);
    button.addEventListener('click', show);
  });
  $$('.proof-row')[0]?.click();
}

setupTheme();
setupChrome();
const claimField = $('#claim-field');
if (claimField) setupClaimField(claimField);
setupExchangeTape();
setupMechanism();
setupRecovery();
setupProof();
