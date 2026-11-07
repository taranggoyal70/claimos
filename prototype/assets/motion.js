import { claimBeats, engineSteps, caseRecord, money } from './demo-data.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = selector => document.querySelector(selector);

// Animate the actual business transformation: scattered records converge on a case.
const canvas = $('[data-opportunity-field]');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let width = 1, height = 1, visible = false, frame = 0;
  const particles = Array.from({ length: 54 }, (_, i) => ({
    x: ((i * 73 + 19) % 101) / 100, y: ((i * 37 + 7) % 101) / 100,
    phase: i * .131, size: i % 9 === 0 ? 5 : 2,
  }));
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    width = box.width; height = box.height;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = now => {
    frame = 0;
    if (!visible || document.hidden) return;
    const styles = getComputedStyle(canvas);
    ctx.clearRect(0, 0, width, height);
    const t = reduced ? .5 : now / 13000;
    const target = { x: width * .52, y: height * .48 };
    for (const p of particles) {
      const phase = (t + p.phase) % 1;
      const e = phase * phase * (3 - 2 * phase);
      const from = { x: p.x * width, y: p.y * height };
      const x = from.x + (target.x - from.x) * e;
      const y = from.y + (target.y - from.y) * e + Math.sin(phase * Math.PI) * 20;
      ctx.globalAlpha = Math.sin(phase * Math.PI) * .28;
      ctx.strokeStyle = styles.getPropertyValue('--recovery');
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(target.x, target.y); ctx.lineWidth = .45; ctx.stroke();
      ctx.globalAlpha *= 2;
      ctx.fillRect(x, y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (!reduced) frame = requestAnimationFrame(draw);
  };
  const start = () => { if (visible && !document.hidden && !frame) frame = requestAnimationFrame(draw); };
  new ResizeObserver(() => { resize(); start(); }).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; } else start();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start();
  });
  addEventListener('themechange', start);
  resize();
}

const model = $('.recovery-model');
if (model && !reduced) {
  new MutationObserver(mutations => {
    if (!mutations.some(m => m.attributeName === 'data-stage')) return;
    const agent = model.querySelector('.model-agent');
    agent.getAnimations().forEach(a => a.cancel());
    agent.animate([{ opacity: .2, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
    if (model.dataset.stage === '0') {
      const doc = model.querySelector('.model-document');
      doc.animate([{ opacity: 0, transform: 'translateY(-24px) rotate(-7deg)' }, { opacity: 1, transform: 'translateY(0) rotate(-3deg)' }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  }).observe(model, { attributes: true, attributeFilter: ['data-stage'] });
}
if (model && !reduced && matchMedia('(pointer: fine)').matches) {
  let frame = 0;
  model.addEventListener('pointermove', event => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const box = model.getBoundingClientRect();
      model.style.setProperty('--tilt-x', `${-(event.clientY - box.top - box.height / 2) / box.height * 7}deg`);
      model.style.setProperty('--tilt-y', `${(event.clientX - box.left - box.width / 2) / box.width * 7}deg`);
    });
  });
  model.addEventListener('pointerleave', () => { model.style.setProperty('--tilt-x', '0deg'); model.style.setProperty('--tilt-y', '0deg'); });
}

// The shared engine / desk adapter from the team's eight-step operating model.
const path = $('[data-engine-path]');
if (path) {
  let current = -1, paused = reduced, visible = false;
  const pause = $('[data-engine-pause]');
  const select = (index, animate = true) => {
    current = index;
    const step = engineSteps[index];
    path.querySelectorAll('button').forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      button.classList.toggle('completed', i < index);
    });
    $('[data-engine-name]').textContent = claimBeats[index].label;
    $('[data-engine-number]').textContent = String(index + 1).padStart(2, '0');
    $('[data-engine-shared]').textContent = step.shared;
    $('[data-engine-desk]').textContent = step.desk;
    $('[data-engine-output]').textContent = step.output;
    $('.engine-board').style.setProperty('--engine-progress', `${(index + .5) / 8 * 100}%`);
    if (animate && !reduced) {
      for (const el of document.querySelectorAll('.engine-core-content,.engine-adapter h3')) {
        el.getAnimations().forEach(a => a.cancel());
        el.animate([{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }], { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    }
  };
  const updatePause = () => { pause.textContent = paused ? 'Play flow ▷' : 'Pause flow Ⅱ'; pause.setAttribute('aria-pressed', String(paused)); };
  claimBeats.forEach((beat, i) => {
    const button = document.createElement('button'); button.type = 'button';
    button.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span><b>${beat.label}</b><i>${engineSteps[i].icon}</i>`;
    button.addEventListener('click', () => { paused = true; updatePause(); select(i); });
    path.append(button);
  });
  pause.addEventListener('click', () => { paused = !paused; updatePause(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(path);
  setInterval(() => { if (!paused && visible && !document.hidden) select((current + 1) % 8); }, 4200);
  select(0, false); updatePause();
}

// Scenes are illustrative documents, never provider actions. They respond to real replay state.
const theatre = $('[data-stage-theatre]');
if (theatre) {
  const scenes = [
    () => `<div class="scene-scan"><div class="scan-heading"><span>COUNTY ASSESSMENT ROLL</span><b data-scene-count="218431">218,431</b></div><div class="scan-records">${['812 Hayes St.','219 Oak St.','842 Maple Ave.','470 Pine St.'].map((address,i) => `<div class="scan-row ${i === 2 ? 'chosen' : ''}" style="--row:${i}"><span>${address}</span><b>${i === 2 ? '+10.2% gap' : 'Within range'}</b><i>${i === 2 ? '→' : '·'}</i></div>`).join('')}</div><i class="scan-beam"></i><span class="scene-foot">One property rises above the noise.</span></div>`,
    () => `<div class="scene-economics"><span class="scene-caption">THE CASE CLEARS THE THRESHOLD</span><div class="economics-columns"><div><span>Expected value</span><b data-scene-count="713" data-count-money>$713</b><i style="--column:88%"></i></div><div><span>Projected cost</span><b>$138.40</b><i style="--column:23%"></i></div></div><div class="economics-decision"><span>✓ Worth pursuing</span><small>70% win estimate · evidence available</small></div></div>`,
    () => `<div class="scene-engagement"><div class="engagement-page"><span class="scene-caption">OWNER ENGAGEMENT · SAMPLE</span><b>Jordan Lee</b><span>842 Maple Avenue · Property Tax</span><div class="signature-line"><svg viewBox="0 0 220 45" aria-label="Illustrative signature"><path d="M15 25C50-4 32 51 25 30S68 2 56 26S87 12 82 28S115 14 108 30C121 3 130 6 123 29S153 20 166 26L205 20"/></svg><small>Engagement & fee terms acknowledged</small></div></div><div class="scene-seal">✓<span>Consent recorded</span></div></div>`,
    () => `<div class="scene-evidence"><span class="scene-caption">THE EVIDENCE COMES TOGETHER</span><div class="exhibit-fan">${['Assessment','Comparable sales','Property photos','Value history'].map((name,i) => `<div class="exhibit-document" style="--doc:${i}"><small>EXHIBIT E-0${i+1}</small><span class="doc-lines"></span><b>${name}</b><i>✓ Source linked</i></div>`).join('')}</div><span class="scene-foot">4 exhibits. One defensible packet.</span></div>`,
    () => `<div class="scene-filing"><div class="filing-packet"><span class="scene-caption">APPEAL APPLICATION · SAMPLE</span><b>Property tax appeal</b><small>Jordan Lee · 4 exhibits attached</small><div class="filing-seal" data-filing-seal>OWNER REVIEW</div></div><div class="filing-receipt" data-filing-receipt><span>Submission held</span><b>Owner decides before filing.</b></div></div>`,
    () => `<div class="scene-chase"><div class="clock-dial"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43"/><circle class="clock-progress" cx="50" cy="50" r="43"/></svg><b>07<span>days later</span></b></div><div class="followup-messages"><span class="scene-caption">TIME COMPRESSED · SIMULATED</span><div class="followup-mail"><i>↗</i><div><b>Status request sent</b><small>Reply linked to the same case</small></div><span>✓</span></div><div class="followup-mail"><i>◷</i><div><b>Next follow-up scheduled</b><small>Before the response deadline</small></div><span>✓</span></div></div></div>`,
    () => `<div class="scene-appeal"><div class="denial-document"><span class="scene-caption">SAMPLE RESPONSE</span><b>More evidence requested</b><p>Comparable sale suitability questioned.</p><span class="denial-highlight">Reason identified</span></div><span class="appeal-arrow">→</span><div class="appeal-document"><span class="scene-caption">NEXT PERMITTED STEP</span><b>Supplemental evidence</b><p>Sale conditions explained. Supporting sources linked.</p><span>✓ Appeal response prepared</span></div></div>`,
    () => `<div class="scene-collection"><div class="outcome-confirmed"><span class="outcome-check">✓</span><span class="scene-caption">SAMPLE ADJUSTMENT VERIFIED</span><b data-scene-count="1018" data-count-money>$1,018</b><small>annual savings confirmed in this replay</small></div><div class="success-invoice"><span>Agreed success fee</span><b>${money(caseRecord.estimatedFee)}</b><span class="invoice-paid">SIMULATED · PAID</span></div></div>`,
  ];
  let generation = 0;
  let current = -1;
  const count = () => {
    const id = generation;
    const el = theatre.querySelector('[data-scene-count]');
    if (!el || reduced) return;
    const target = Number(el.dataset.sceneCount), start = performance.now();
    const tick = now => {
      if (id !== generation) return;
      const p = Math.min(1, (now-start)/1100), value = Math.round(target*(1-(1-p)**3));
      el.textContent = el.hasAttribute('data-count-money') ? money(value) : value.toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  addEventListener('claimos:stage', event => {
    const { index, phase } = event.detail;
    if (index < 0) { generation++; current = -1; theatre.innerHTML = '<div class="theatre-idle">The company is ready.</div>'; delete theatre.dataset.scene; return; }
    if (phase === 'filed' || phase === 'rejected') {
      theatre.dataset.filed = phase === 'filed' ? 'true' : 'false';
      theatre.querySelector('[data-filing-seal]').textContent = phase === 'filed' ? 'RECEIVED' : 'DECLINED';
      theatre.querySelector('[data-filing-receipt]').innerHTML = phase === 'filed' ? '<span>Sample receipt · SF-11847</span><b>Saved. Response clock started.</b>' : '<span>Owner declined</span><b>No filing action taken.</b>';
      return;
    }
    if (current !== index) {
      generation++; current = index; delete theatre.dataset.filed;
      theatre.innerHTML = scenes[index](); theatre.dataset.scene = claimBeats[index].id;
      count();
      if (!reduced) {
        theatre.animate([{ opacity: .2, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    }
    theatre.dataset.phase = phase;
    if (phase === 'ready' && index === 0) count();
  });
}
