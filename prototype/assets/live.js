import { caseRecord, evidence, transcript, claimBeats, money } from './demo-data.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const workOrder = ['find', 'qualify', 'voice', 'evidence', 'filing', 'chase', 'escalate', 'collect'];
const beats = claimBeats.map((stage, index) => ({
  ...stage, caption: stage.summary,
  facts: ['claimant', 'apn', 'assessed', 'recovery'],
  work: workOrder.slice(0, index + 1), evidence: index < 2 ? index : index === 2 ? 1 : 4,
  money: 3 + index * (95 / 7), decision: index >= 1, call: index >= 2, approval: index === 4,
}));

const app = {
  beat: -1,
  busy: false,
  answered: null,
  captions: true,
  details: false,
  voiceOn: false,
  voiceMode: 'off',
  naiveAvailable: false,
  callStartedAt: 0,
  callClockTimer: 0,
  events: [],
  run: 0,
};

const naiveAudioCache = new Map();
let currentAudio = null;

let voiceCache = [];
function availableVoices() {
  if (!('speechSynthesis' in window)) return [];
  voiceCache = window.speechSynthesis.getVoices();
  return voiceCache;
}
if ('speechSynthesis' in window) {
  availableVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', availableVoices);
}

function pickVoice(who) {
  const voices = availableVoices().filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
  const pattern = who === 'Agent'
    ? /Ava|Samantha|Victoria|Karen|Moira|Susan|Zira|Female/i
    : /Daniel|Alex|Tom|Fred|David|Male|Google UK English Male/i;
  return voices.find((voice) => pattern.test(voice.name)) ?? voices[who === 'Agent' ? 0 : Math.min(1, voices.length - 1)];
}

function startCallClock() {
  clearInterval(app.callClockTimer);
  app.callStartedAt = Date.now();
  const tick = () => {
    const elapsed = Math.max(0, Math.floor((Date.now() - app.callStartedAt) / 1000));
    const clock = $('[data-call-clock]');
    if (clock) clock.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  };
  tick();
  app.callClockTimer = setInterval(tick, 1000);
}

function stopCallClock() {
  clearInterval(app.callClockTimer);
  app.callClockTimer = 0;
}

function setVoice(mode) {
  const allowed = new Set(['off', 'browser', 'naive']);
  app.voiceMode = allowed.has(mode) ? mode : 'off';
  if (app.voiceMode === 'naive' && !app.naiveAvailable) app.voiceMode = 'browser';
  app.voiceOn = app.voiceMode !== 'off';
  const button = $('[data-voice]');
  button.textContent = app.voiceMode === 'naive' ? 'Naïve voice' : app.voiceMode === 'browser' ? 'Browser voice' : 'Voice off';
  button.classList.toggle('on', app.voiceOn);
  button.setAttribute('aria-pressed', String(app.voiceOn));
  button.title = app.naiveAvailable ? 'Click to cycle: off → Naïve → browser' : 'Naïve is not authenticated; browser voice is available';
  if (!app.voiceOn) {
    window.speechSynthesis?.cancel();
    currentAudio?.pause();
    currentAudio = null;
  }
}

function cycleVoice() {
  if (app.voiceMode === 'off') setVoice(app.naiveAvailable ? 'naive' : 'browser');
  else if (app.voiceMode === 'naive') setVoice('browser');
  else setVoice('off');
}

async function detectNaiveVoice() {
  try {
    const response = await fetch('/api/voice/status', { cache: 'no-store' });
    const status = response.ok ? await response.json() : null;
    app.naiveAvailable = Boolean(status?.configured);
  } catch {
    app.naiveAvailable = false;
  }
  setVoice(app.voiceMode);
}

function browserSpeak(text, who) {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = who === 'Agent' ? 0.98 : 0.92;
    utterance.pitch = who === 'Agent' ? 1.03 : 0.9;
    utterance.volume = 0.92;
    const preferred = pickVoice(who);
    if (preferred) utterance.voice = preferred;
    let settled = false;
    let timer = 0;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const words = text.trim().split(/\s+/).length;
    timer = setTimeout(done, Math.min(18000, Math.max(5000, words * 650)));
    utterance.onend = utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
  });
}

async function loadNaiveSpeech(text, who) {
  const voice = who === 'Agent' ? 'coral' : 'echo';
  const speed = who === 'Agent' ? 0.96 : 0.9;
  const key = `${voice}|${speed}|${text}`;
  if (naiveAudioCache.has(key)) return naiveAudioCache.get(key);
  const pending = fetch('/api/voice/speak', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, voice, speed }),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`naive_voice_${response.status}`);
    return URL.createObjectURL(await response.blob());
  });
  naiveAudioCache.set(key, pending);
  try {
    const url = await pending;
    naiveAudioCache.set(key, url);
    return url;
  } catch (error) {
    naiveAudioCache.delete(key);
    throw error;
  }
}

async function naiveSpeak(text, who) {
  const url = await loadNaiveSpeech(text, who);
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => { currentAudio = null; resolve(); };
    audio.onerror = () => { currentAudio = null; reject(new Error('naive_audio_playback_failed')); };
    audio.play().catch(reject);
  });
}

async function speak(text, who) {
  if (!app.voiceOn) return;
  if (app.voiceMode === 'naive') {
    try {
      await naiveSpeak(text, who);
      return;
    } catch {
      app.naiveAvailable = false;
      setVoice('browser');
      cue('Naïve voice is unavailable. Continuing with the browser fallback.');
    }
  }
  await browserSpeak(text, who);
}

function setupThemeShortcut() {
  addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 't' || event.metaKey || event.ctrlKey) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('gcm-theme', dark ? 'light' : 'dark'); } catch {}
  });
}

function setupWave() {
  const wave = $('.wave');
  wave.innerHTML = Array.from({ length: 46 }, (_, index) => `<i style="--i:${index};--h:${(Math.sin(index * 1.73) + 1) / 2}"></i>`).join('');
}

function renderTranscript(visibleCount) {
  const root = $('.transcript');
  root.innerHTML = transcript.map((line, index) => `<article class="transcript-row${line.fact ? ' fact' : ''}${index < visibleCount ? ' visible' : ''}">
    <time>${line.at}</time><strong>${line.who}</strong><div><p>${line.text}</p>${line.fact ? `<span class="fact-chip">${line.fact}</span>` : ''}</div>
  </article>`).join('');
  const last = $$('.transcript-row.visible', root).at(-1);
  if (last) root.scrollTop = root.scrollHeight;
}

function flowFact(row, target) {
  if (reducedMotion || !row || !target) return;
  const layer = $('#flow-layer');
  const bounds = layer.getBoundingClientRect();
  const from = row.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const x1 = from.right - bounds.left - 8;
  const y1 = from.top + from.height / 2 - bounds.top;
  const x2 = to.left - bounds.left + 12;
  const y2 = to.top + to.height / 2 - bounds.top;
  for (let index = 0; index < 10; index++) {
    const particle = document.createElement('i');
    particle.className = 'flow-particle';
    particle.style.setProperty('--x1', `${x1}px`);
    particle.style.setProperty('--y1', `${y1}px`);
    particle.style.setProperty('--x2', `${x2}px`);
    particle.style.setProperty('--y2', `${y2}px`);
    particle.style.setProperty('--delay', `${index * 52}ms`);
    layer.append(particle);
    particle.addEventListener('animationend', () => particle.remove(), { once: true });
  }
  target.classList.remove('flash');
  void target.offsetWidth;
  setTimeout(() => target.classList.add('flash'), 760);
}

function moment(kicker, title, sub, duration = 1650) {
  if (reducedMotion) return Promise.resolve();
  const run = app.run;
  const overlay = $('#moment-overlay');
  $('#moment-kicker').textContent = kicker;
  $('#moment-title').textContent = title;
  $('#moment-sub').textContent = sub;
  overlay.classList.add('on');
  return wait(duration).then(() => {
    if (run !== app.run) return;
    overlay.classList.remove('on');
    return wait(480);
  });
}

function renderEvidence(count) {
  const root = $('.evidence-live');
  root.innerHTML = `<h3>Evidence exhibits</h3>${evidence.map((item, index) => `<div class="evidence-row${index < count ? ' visible' : ''}">
    <span class="tag">${item.id}</span><strong>${item.label}</strong><small>${index < count ? item.value : 'waiting'}</small>
  </div>`).join('')}`;
}

function log(event, detail) {
  app.events.push({ at: new Date().toLocaleTimeString('en-US', { hour12: false }), event, detail });
  renderDetails();
}

function renderDetails() {
  const text = (tag, value) => { const el = document.createElement(tag); el.textContent = value; return el; };
  const stream = $('#event-stream');
  stream.replaceChildren();
  if (!app.events.length) stream.append(text('p', 'Start the recovery to see the company’s decisions here.'));
  for (const entry of app.events) {
    const row = document.createElement('article');
    row.className = 'activity-event';
    row.append(text('time', entry.at), text('b', entry.event), text('p', entry.detail));
    stream.append(row);
  }
  const facts = document.createElement('dl');
  facts.className = 'activity-state';
  for (const [label, value] of [
    ['Property', caseRecord.address], ['Claimant', caseRecord.claimant], ['Potential annual savings', money(caseRecord.potentialRecovery)],
    ['Current stage', app.beat < 0 ? 'Ready to start' : beats[app.beat].title],
    ['Owner decision', app.answered === 'approve' ? 'Authorized in this replay' : app.answered === 'reject' ? 'Declined in this replay' : 'Awaiting authorization'],
    ['Evidence exhibits', `${Math.min(evidence.length, app.beat < 0 ? 0 : beats[app.beat].evidence)} of ${evidence.length} available`],
    ['Mode', 'Illustrative replay · simulated filing and payment'],
  ]) {
    const row = document.createElement('div');
    row.append(text('dt', label), text('dd', value));
    facts.append(row);
  }
  $('#case-state').replaceChildren(facts);
}

function cue(text) {
  const caption = $('#caption');
  caption.textContent = text || '';
  caption.classList.toggle('on', Boolean(text) && app.captions);
}

function setReady(ready) {
  const button = $('[data-next]');
  button.classList.toggle('ready', ready);
  button.disabled = !ready;
  const names = ['Find opportunity', 'Check eligibility', 'Sign up Jordan', 'Build the evidence', 'Prepare filing', 'Follow up on the case', 'Review the denial', 'Verify and collect'];
  button.replaceChildren(document.createTextNode(!ready ? (app.beat === 4 && !app.busy ? 'Owner decision required' : app.beat === 7 ? 'Recovery reconciled' : 'Company working…') : app.beat < 0 ? 'Start the recovery' : names[app.beat + 1] || 'Recovery reconciled'));
  const arrow = document.createElement('span'); arrow.textContent = '→'; button.append(arrow);
  const prev = $('[data-previous]');
  prev.disabled = app.busy || app.beat <= 0;
  $('[data-demo-current]').textContent = app.beat < 0 ? 'Ready when you are.' : beats[app.beat].title;
  $('[data-demo-description]').textContent = app.beat < 0 ? 'Start with the opportunity. Follow it through to authorization.' : beats[app.beat].caption;
  $$('[data-demo-step]').forEach((step, i) => {
    step.classList.toggle('active', i === app.beat);
    step.classList.toggle('done', i < app.beat);
    if (i === app.beat) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
  });
}

function renderMoney(progress) {
  const line = $('#money-line');
  line.style.setProperty('--money-progress', `${progress}%`);
  const positions = beats.map(beat => beat.money);
  $$('.money-node', line).forEach((node, index) => {
    node.classList.toggle('done', positions[index] < progress);
    node.classList.toggle('current', Math.abs(positions[index] - progress) < .01);
  });
}

function renderWork(active) {
  const names = workOrder;
  names.forEach((name) => {
    const row = $(`[data-work="${name}"]`);
    const visible = active.includes(name);
    row.classList.toggle('visible', visible);
    row.classList.toggle('done', visible && !(name === 'filing' && !app.answered));
    row.classList.toggle('wait', visible && name === 'filing' && !app.answered);
  });
}

async function revealCall(run) {
  $('#channel').classList.add('has-call');
  if (app.voiceMode === 'naive') {
    $('[data-speaker-state]').textContent = 'Preparing Naïve voices';
    try {
      for (let index = 0; index < transcript.length; index += 2) {
        await Promise.all(transcript.slice(index, index + 2).map((item) => loadNaiveSpeech(item.text, item.who)));
      }
    } catch {
      app.naiveAvailable = false;
      setVoice('browser');
      cue('Naïve voice could not be prepared. Continuing with the browser fallback.');
    }
  }
  if (run !== app.run) return;
  startCallClock();
  renderTranscript(0);
  for (let index = 1; index <= transcript.length; index++) {
    if (run !== app.run) return;
    renderTranscript(index);
    const item = transcript[index - 1];
    const row = $$('.transcript-row.visible').at(-1);
    const channel = $('#channel');
    channel.classList.toggle('speaking-agent', item.who === 'Agent');
    channel.classList.toggle('speaking-jordan', item.who === 'Jordan');
    $('[data-speaker-state]').textContent = `${item.who} speaking`;
    if (!reducedMotion) await wait(app.voiceOn ? 380 : 120);
    await speak(item.text, item.who);
    if (run !== app.run) return;
    if (item.fact) {
      const target = item.fact.includes('address') ? $('[data-fact="apn"]')
        : item.fact.includes('Assessed') ? $('[data-fact="assessed"]')
          : item.fact.includes('Authorization') ? $('[data-work="filing"]')
            : $('[data-fact="claimant"]');
      flowFact(row, target);
    }
    if (!reducedMotion) await wait(app.voiceOn ? (item.who === 'Jordan' ? 760 : 520) : (index === transcript.length ? 500 : 280));
  }
  $('#channel').classList.remove('speaking-agent', 'speaking-jordan');
  $('[data-speaker-state]').textContent = 'Call complete';
  stopCallClock();
}

async function playBeat(index) {
  if (app.busy || index < 0 || index >= beats.length) return;
  app.busy = true;
  const run = app.run;
  setReady(false);
  const beat = beats[index];
  app.beat = index;
  $('.dossier-left').scrollTop = 0;
  setReady(false);
  $('#dossier-live').classList.add('has-case');
  $('.dossier-empty').hidden = true;
  cue(beat.caption);
  log(`Beat ${index + 1}: ${beat.title}`, beat.caption);
  dispatchEvent(new CustomEvent('claimos:stage', { detail: { index, phase: 'working' } }));
  if (index === 0) await moment('OPPORTUNITY FOUND', '$1,018', 'Potential annual savings · sample property', 1200);
  if (run !== app.run) return;

  renderMoney(beat.money);
  $$('[data-fact]').forEach((fact) => fact.classList.toggle('visible', beat.facts.includes(fact.dataset.fact)));
  renderWork(beat.work);
  renderEvidence(beat.evidence);
  $('#decision-card').classList.toggle('visible', Boolean(beat.decision));

  if (beat.call && !$('#channel').classList.contains('has-call')) await revealCall(run);
  else if (beat.call) renderTranscript(transcript.length);

  if (!reducedMotion) await wait(950);
  if (run !== app.run) return;
  $('#approval-card').classList.toggle('on', Boolean(beat.approval) && !app.answered);
  if (beat.approval) {
    cue('The packet is complete. Owner authorization is required before this sample filing proceeds.');
    log('Approval requested', 'Filing-ready packet held for claimant authorization.');
  }
  app.busy = false;
  dispatchEvent(new CustomEvent('claimos:stage', { detail: { index, phase: 'ready' } }));
  if (index === beats.length - 1) {
    setReady(false);
    if (!reducedMotion) await wait(2200);
    if (run === app.run) finale(true);
  } else setReady(!beat.approval || app.answered === 'approve');
  renderDetails();
}

function finale(approved) {
  const overlay = $('#finale');
  $('#finale-title').textContent = approved ? 'One case, carried forward.' : 'One accountable decision.';
  $('#finale-sub').textContent = approved
    ? 'Eight stages completed · $1,018 sample annual savings · invoice and payment simulated'
    : 'Nothing was submitted · the decision and evidence remain preserved in the case ledger';
  const metrics = $('.finale-metrics');
  metrics.replaceChildren();
  for (const [value, label] of approved
    ? [[money(caseRecord.estimatedFee), 'sample success fee'], ['$1,018', 'sample annual savings'], ['8 / 8', 'workflow stages']]
    : [['$0', 'payment processed'], ['Owner declined', 'filing held'], ['4 / 8', 'stages completed']]) {
    const item = document.createElement('span'), amount = document.createElement('b');
    amount.textContent = value; item.append(amount, document.createTextNode(label)); metrics.append(item);
  }
  overlay.classList.add('on');
}

async function decide(option) {
  if (app.answered || app.beat !== 4 || app.busy) return;
  const run = app.run;
  app.busy = true;
  app.answered = option;
  $('#approval-card').classList.remove('on');
  cue(option === 'approve' ? 'Authorized. The company delivers the packet and starts the response clock.' : 'Rejected. Nothing was submitted.');
  log(option === 'approve' ? 'Authorization approved' : 'Authorization rejected', option === 'approve'
    ? 'Filing-ready packet delivered; receipt saved; follow-up scheduled.'
    : 'No filing action taken; case remains closed with evidence preserved.');
  renderMoney(beats[4].money);
  $('[data-work="filing"]').classList.remove('wait');
  $('[data-work="filing"]').classList.toggle('done', option === 'approve');
  dispatchEvent(new CustomEvent('claimos:stage', { detail: { index: 4, phase: option === 'approve' ? 'filed' : 'rejected' } }));
  if (!reducedMotion) await wait(1400);
  if (run !== app.run) return;
  app.busy = false;
  if (option === 'approve') { renderDetails(); setReady(true); }
  else finale(false);
}

function restart() {
  app.run++;
  app.beat = -1;
  app.busy = false;
  app.answered = null;
  app.events = [];
  $('#channel').classList.remove('has-call');
  $('#dossier-live').classList.remove('has-case');
  $('.dossier-empty').hidden = false;
  $('#approval-card').classList.remove('on');
  $('#finale').classList.remove('on');
  $('#decision-card').classList.remove('visible');
  $('#details-panel').classList.remove('on');
  $('#moment-overlay').classList.remove('on');
  window.speechSynthesis?.cancel();
  currentAudio?.pause();
  currentAudio = null;
  stopCallClock();
  const clock = $('[data-call-clock]');
  if (clock) clock.textContent = '00:00';
  const speaker = $('[data-speaker-state]');
  if (speaker) speaker.textContent = 'Connected';
  $('#channel').classList.remove('speaking-agent', 'speaking-jordan');
  app.details = false;
  renderMoney(0);
  renderWork([]);
  renderEvidence(0);
  renderTranscript(0);
  $$('[data-fact]').forEach((fact) => fact.classList.remove('visible'));
  cue('');
  setReady(true);
  renderDetails();
  dispatchEvent(new CustomEvent('claimos:stage', { detail: { index: -1, phase: 'reset' } }));
}

function next() {
  if (app.busy || app.beat >= beats.length - 1 || (app.beat === 4 && app.answered !== 'approve')) return;
  playBeat(app.beat + 1);
}

function previous() {
  if (app.busy || app.beat <= 0) return;
  if (app.beat <= 5) app.answered = null;
  $('#approval-card').classList.remove('on');
  playBeat(app.beat - 1);
}

function toggleDetails() {
  app.details = !app.details;
  $('#details-panel').classList.toggle('on', app.details);
  renderDetails();
}

function onKey(event) {
  if (event.target.closest?.('input,textarea,[contenteditable]')) return;
  const key = event.key.toLowerCase();
  if (key === 'arrowright') { event.preventDefault(); next(); }
  else if (key === 'arrowleft') { event.preventDefault(); previous(); }
  else if (key === 'a' && $('#approval-card').classList.contains('on')) decide('approve');
  else if (key === 'r' && !event.shiftKey && $('#approval-card').classList.contains('on')) decide('reject');
  else if (key === 'r' && event.shiftKey) restart();
  else if (key === 'c') { app.captions = !app.captions; $('#caption').classList.toggle('on', app.captions && Boolean($('#caption').textContent)); }
  else if (key === 'd') toggleDetails();
  else if (key === 'v') cycleVoice();
  else if (key === 'escape' && app.details) toggleDetails();
}

setupThemeShortcut();
setupWave();
setVoice('off');
detectNaiveVoice();
renderEvidence(0);
renderTranscript(0);
renderDetails();
renderMoney(0);
setReady(true);

$('[data-next]').addEventListener('click', next);
$('[data-approve]').addEventListener('click', () => decide('approve'));
$('[data-reject]').addEventListener('click', () => decide('reject'));
$('[data-restart]').addEventListener('click', restart);
$('[data-voice]').addEventListener('click', cycleVoice);
$('[data-details]').addEventListener('click', toggleDetails);
$('[data-details-close]').addEventListener('click', toggleDetails);
$('[data-previous]').addEventListener('click', previous);
addEventListener('keydown', onKey);
