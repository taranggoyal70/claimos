import { evidence, receipts } from './demo-data.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function setupTheme() {
  const button = $('[data-theme-toggle]');
  if (!button) return;
  const label = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    button.textContent = dark ? 'Light' : 'Dark';
    button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  };
  button.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('gcm-theme', dark ? 'light' : 'dark'); } catch {}
    label();
  });
  label();
}

function setupIntake() {
  const button = $('[data-use-sample]');
  if (!button) return;
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Classifying…';
    await new Promise((resolve) => setTimeout(resolve, 900));
    $('#intake-result').classList.add('on');
    button.textContent = 'Classified';
  });
}

function renderReceipts() {
  $$('[data-receipts]').forEach((root) => {
    root.innerHTML = receipts.map((item) => `<div class="receipt-line"><time>${item.at}</time><span>${item.agent} · ${item.action}</span><b>${item.receipt}</b></div>`).join('');
  });
}

function renderEvidence() {
  const body = $('[data-evidence-table]');
  if (!body) return;
  body.innerHTML = evidence.map((item) => `<tr><td>${item.id}</td><td>${item.label}</td><td>${item.source}</td><td>${item.value}</td><td>${item.status}</td></tr>`).join('');
}

setupTheme();
setupIntake();
renderReceipts();
renderEvidence();

function setupQualification() {
  const button = $('[data-run-qualify]');
  if (!button) return;
  const select = $('[data-qualify-select]');
  const status = $('[data-qualify-status]');
  const detail = $('[data-qualify-detail]');
  let cases = [];
  const money = n => n == null ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  function render() {
    const record = cases.find(c => c.id === select.value);
    if (!record) return;
    detail.replaceChildren(node('h3', `${record.address} · ${record.status.replaceAll('_', ' ')}`), node('p', record.summary));
    const facts = node('dl', '', 'dossier-summary');
    for (const [label, value] of [['Annual savings', money(record.potentialRecovery)], ['Expected value', money(record.expectedValue)], ['Fee if successful', money(record.estimatedFee)], ['Release', record.releaseDate || 'Not released']]) {
      const item = node('div', '');
      item.append(node('dt', label), node('dd', value));
      facts.append(item);
    }
    const stages = node('ol', '', 'qualify-stages');
    for (const stage of record.qualify.stageLog) stages.append(node('li', `${stage.stage} · ${stage.outcome} — ${stage.detail || 'Checks passed'}`));
    const audit = node('details', '');
    audit.append(node('summary', 'Decision record and evidence references'), node('pre', JSON.stringify(record.qualify, null, 2)));
    detail.append(facts, node('h3', 'Decision trail'), stages, audit);
  }
  select.addEventListener('change', render);
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Evaluating intake, eligibility, comparable sales, economics and filing routes…';
    try {
      const response = await fetch('/api/qualify');
      if (!response.ok) throw new Error('Qualification service is unavailable. Please retry.');
      const run = await response.json();
      cases = run.cases;
      $('[data-qualify-counts]').replaceChildren(...Object.entries(run.counts).map(([key, value]) => node('span', `${value} ${key.toLowerCase().replaceAll('_', ' ')}`)));
      select.replaceChildren(...cases.map(record => {
        const option = node('option', `${record.address} · ${record.status.replaceAll('_', ' ')}`);
        option.value = record.id;
        return option;
      }));
      select.disabled = false;
      status.textContent = `${cases.length} properties evaluated · ${run.released} released to Sign-up · ${run.merged} duplicate merged. Synthetic run completed ${new Date(run.runAt).toLocaleTimeString()}.`;
      render();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Run again →';
    }
  });
}
setupQualification();
