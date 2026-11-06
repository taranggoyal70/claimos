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
