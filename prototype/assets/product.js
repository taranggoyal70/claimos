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
  const queue = $('[data-qualify-queue]');
  let cases = [];
  const labels = { QUALIFIED: 'Ready to pursue', NEEDS_REVIEW: 'Needs a review', NEXT_CYCLE: 'Next filing window', INCOMPLETE: 'Missing information', REJECTED: 'Not pursuing' };
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
    for (const item of queue.children) item.setAttribute('aria-pressed', String(item.dataset.caseId === record.id));
    const heading = node('div', '', 'qualify-result-head');
    const title = node('div', '');
    title.append(node('span', 'Property tax appeal', 'eyebrow'), node('h3', record.address));
    const badge = node('span', labels[record.status], 'qualify-badge');
    badge.dataset.status = record.status;
    heading.append(title, badge);
    const action = record.status === 'QUALIFIED' ? (record.releaseDate ? 'Selected for the next Sign-up step.' : 'Qualified and waiting for available capacity.')
      : record.status === 'NEEDS_REVIEW' ? 'A person must review this opportunity before it can proceed.'
      : record.status === 'NEXT_CYCLE' ? 'Wait for the next filing window, then check eligibility again.'
      : record.status === 'INCOMPLETE' ? 'Gather the missing information before making a decision.' : 'No outreach or filing is planned for this property.';
    detail.replaceChildren(heading, node('p', action, 'qualify-next'));
    const facts = node('dl', '', 'dossier-summary');
    for (const [label, value] of [['Potential savings / year', money(record.potentialRecovery)], ['Expected company return', money(record.expectedValue)], ['Fee if successful', money(record.estimatedFee)], ['Filing deadline', record.deadline || 'No open route']]) {
      const item = node('div', '');
      item.append(node('dt', label), node('dd', value));
      facts.append(item);
    }
    const stages = node('ol', '', 'qualify-stages');
    const stageNames = { S0: 'Property information', S1: 'Contact and ownership checks', S2: 'Appeal eligibility', S3: 'Comparable sales', S4: 'Cost and potential return', S5: 'Filing window', S6: 'Additional review', S7: 'Final decision' };
    const q = record.qualify;
    const pct = n => `${Math.round(n * 100)}%`;
    const explanation = {
      S0: 'Property information received and checked.', S1: 'No contact restrictions or existing case found.',
      S2: 'Property type and ownership meet the review requirements.',
      S3: q.valuation ? `${q.valuation.compsUsed.length} comparable sales support a proposed value of ${money(q.valuation.target)}.` : 'Comparable sales checked.',
      S4: q.economics ? `${pct(q.economics.pWin)} estimated chance of success, with ${money(q.economics.ev)} expected company return.` : 'Costs and return checked.',
      S5: record.deadline ? `Available route: ${record.routeName}. Due ${record.deadline}.` : 'No suitable filing window is available.',
      S6: 'Simulated reviewer checked the supporting information.', S7: action,
    };
    for (const stage of q.stageLog) {
      const row = node('li', '', 'qualify-stage');
      row.dataset.outcome = stage.outcome;
      row.append(node('span', stage.outcome === 'stop' ? '—' : stage.outcome === 'skip' ? '·' : '✓', 'qualify-stage-icon'));
      const copy = node('div', '');
      copy.append(node('strong', stageNames[stage.stage]), node('p', stage.outcome === 'stop' ? record.summary.replace(/^(Not pursuing|Needs more data|Good claim, no window open):\s*/, '') : stage.outcome === 'skip' ? 'No additional automated review was needed.' : explanation[stage.stage]));
      row.append(copy);
      stages.append(row);
    }
    const audit = node('details', '', 'qualify-audit');
    audit.append(node('summary', 'Decision details'));
    const auditFacts = node('dl', '', 'qualify-audit-facts');
    for (const [label, value] of [['Property reference', record.apn], ['Decision made by', q.audit.decidedBy.startsWith('human:') ? q.audit.decidedBy.slice(6) : q.audit.decidedBy === 'llm' ? 'Simulated reviewer' : 'Eligibility rules'], ['Recorded', new Date(q.audit.decidedAt).toLocaleString()], ['Valuation confidence', record.confidence == null ? 'Unavailable' : pct(record.confidence)]]) {
      auditFacts.append(node('dt', label), node('dd', value));
    }
    audit.append(auditFacts);
    detail.append(facts, node('h4', 'How we reached this decision'), stages, audit);
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
      $('[data-qualify-counts]').replaceChildren(...Object.entries(run.counts).map(([key, value]) => {
        const count = node('div', '', 'qualify-count');
        count.dataset.status = key;
        count.append(node('b', String(value)), node('span', labels[key]));
        return count;
      }));
      select.replaceChildren(...cases.map(record => {
        const option = node('option', `${record.address} · ${labels[record.status]}`);
        option.value = record.id;
        return option;
      }));
      queue.replaceChildren(...cases.map(record => {
        const item = node('button', '', 'qualify-property');
        item.type = 'button';
        item.dataset.caseId = record.id;
        item.append(node('strong', record.address), node('span', labels[record.status]), node('b', record.potentialRecovery == null ? 'No recovery estimate' : `${money(record.potentialRecovery)} / year`));
        item.addEventListener('click', () => { select.value = record.id; render(); });
        return item;
      }));
      select.disabled = false;
      status.textContent = `${cases.length} properties reviewed · ${run.released} selected for Sign-up · updated ${new Date(run.runAt).toLocaleTimeString()}`;
      render();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Review again →';
    }
  });
}
setupQualification();
