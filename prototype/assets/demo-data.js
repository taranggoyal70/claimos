export const caseRecord = {
  id: 'PT-2026-11847',
  desk: 'Property Tax',
  claimant: 'Jordan Lee',
  address: '842 Maple Avenue, San Francisco, CA 94117',
  apn: '1234/056',
  assessedValue: 1190000,
  proposedValue: 1068333,
  potentialRecovery: 1018,
  probability: 0.7,
  expectedValue: 713,
  analysisDeposit: 49,
  estimatedFee: 178,
  caseCost: 18.4,
  filingFee: 120,
  deadline: 'Dec 15, 2026',
  autonomy: 96,
};

export const claimBeats = [
  {
    id: 'find',
    label: 'Find',
    title: 'The company finds a recoverable case.',
    kicker: '218,431 parcels scanned',
    summary: 'A county-roll scan surfaces one owner-occupied home assessed 10.2% above its comparable range.',
    source: 'San Francisco secured assessment roll · 2026-11-05 09:42 PT',
    value: '$1,018 potential recovery',
    actor: 'Opportunity Agent',
    state: 'possible',
  },
  {
    id: 'qualify',
    label: 'Qualify',
    title: 'Eligibility and economics clear the threshold.',
    kicker: '70% estimated win probability',
    summary: 'The filing window is open, ownership matches, evidence is obtainable, and expected value exceeds cost by 38.7×.',
    source: 'Eligibility rules + county procedure + valuation model',
    value: '$713 expected value',
    actor: 'Eligibility Agent',
    state: 'qualified',
  },
  {
    id: 'signup',
    label: 'Sign up',
    title: 'A conversation becomes a signed engagement.',
    kicker: 'Consent recorded · call 05:27',
    summary: 'The company explains the opportunity, confirms owner consent, and prepares the engagement and fee terms.',
    source: 'Consented voice call · transcript facts linked by timestamp',
    value: '5 verified facts',
    actor: 'Voice Agent',
    state: 'contacted',
  },
  {
    id: 'evidence',
    label: 'Evidence',
    title: 'Evidence becomes a filing-ready dossier.',
    kicker: '4 exhibits · every fact sourced',
    summary: 'The company assembles the assessment record, three comparable sales, six property photos, and assessment history.',
    source: 'County record + comparable-sales report + claimant upload',
    value: '100% evidence complete',
    actor: 'Evidence Agent',
    state: 'proved',
  },
  {
    id: 'file',
    label: 'File',
    title: 'One authorization. A packet with a receipt.',
    kicker: 'Owner authorization required',
    summary: 'The agent prepares the filing, holds for owner authorization, then saves the receipt and response deadline.',
    source: 'Filing-ready packet · BOE-305 · 4 exhibits',
    value: '$1,018 recovery at stake',
    actor: 'Filing Agent',
    state: 'approval',
  },
  {
    id: 'chase', label: 'Chase',
    title: 'The deadline gets a clock. The case gets a follow-up.',
    kicker: 'Follow-up scheduled · replies attached',
    summary: 'The company schedules follow-up, checks the response window, and attaches each incoming reply to the same case.',
    source: 'Simulated inbox and response schedule', value: 'No case left waiting',
    actor: 'Follow-up Agent', state: 'following up',
  },
  {
    id: 'escalate', label: 'Escalate',
    title: 'A denial becomes the next move.',
    kicker: 'Reason understood · evidence supplemented',
    summary: 'A sample denial requests stronger comparable evidence. The agent identifies the issue and prepares the next permitted appeal step for review.',
    source: 'Simulated denial · desk-specific appeal sequence', value: 'Response prepared',
    actor: 'Appeal Agent', state: 'escalating',
  },
  {
    id: 'collect', label: 'Collect',
    title: 'Verified savings become a success-fee invoice.',
    kicker: 'Outcome checked · fee reconciled',
    summary: 'The sample adjustment confirms annual savings. Only then does the company calculate the agreed fee, create an invoice, and track payment.',
    source: 'Simulated adjustment notice and invoice', value: '$1,018 sample annual savings',
    actor: 'Recovery Agent', state: 'reconciled',
  },
];

// Each desk supplies these rules to the same eight-step operating engine.
export const engineSteps = [
  { shared: 'Ingest records, match the owner, parse uploads.', desk: 'County rolls, parcel identifiers and over-assessment detection.', output: 'A sourced candidate property', owner: 'Nick', icon: '⌕' },
  { shared: 'Check eligibility, expected return and remaining time.', desk: 'Local eligibility rules, comparable sales and filing windows.', output: 'A decision with reasons and economics', owner: 'Smaran', icon: '✓' },
  { shared: 'Explain the opportunity, collect consent and engagement.', desk: 'The authorization form, agreed fee terms and signer requirements.', output: 'An authorized customer relationship', owner: null, icon: '↗' },
  { shared: 'Work the evidence checklist and request missing items.', desk: 'Required exhibits, valuation dates and comparable-sale criteria.', output: 'A defensible evidence packet', owner: 'Fra', icon: '▤' },
  { shared: 'Prepare the form, save the receipt and response deadline.', desk: 'The filing destination, accepted form and submission method.', output: 'A traceable submission', owner: 'Tarang', icon: '↳' },
  { shared: 'Schedule follow-up and attach every reply to the case.', desk: 'Follow-up timing, contacts and allowed communication channels.', output: 'An active response clock', owner: null, icon: '◷' },
  { shared: 'Understand the denial and prepare the next appeal step.', desk: 'The permitted remedies, required evidence and escalation order.', output: 'A reasoned next action', owner: null, icon: '↺' },
  { shared: 'Verify the outcome, invoice the fee and reconcile payment.', desk: 'The agreed percentage and the savings it applies to.', output: 'A verified recovery and fee ledger', owner: null, icon: '↗' },
];

export const evidence = [
  { id: 'E-01', label: 'Assessment record', source: 'SF Assessor-Recorder', value: '$1,190,000', status: 'verified' },
  { id: 'E-02', label: 'Comparable sales', source: '3 sales · ≤ 0.5 mi', value: '$1,068,333 median', status: 'verified' },
  { id: 'E-03', label: 'Property photos', source: 'Claimant upload', value: '6 files', status: 'verified' },
  { id: 'E-04', label: 'Assessment history', source: '2022–2026 roll', value: 'No active appeal', status: 'verified' },
];

export const transcript = [
  { at: '00:03', who: 'Agent', text: 'Hi Jordan, this is Ava from Claim OS. This call is recorded. Is it okay if we continue?' },
  { at: '00:11', who: 'Jordan', text: 'Yes, that is fine.', fact: 'Consent recorded' },
  { at: '00:15', who: 'Agent', text: 'I found a possible over-assessment at 842 Maple Avenue. Is that your property?' },
  { at: '00:23', who: 'Jordan', text: 'Yes, it is.', fact: 'Property address confirmed' },
  { at: '00:27', who: 'Agent', text: 'The county has it assessed at one million one hundred ninety thousand dollars. Does that sound right?' },
  { at: '00:37', who: 'Jordan', text: 'Yes, but it has always felt too high.', fact: 'Assessed value $1,190,000' },
  { at: '00:42', who: 'Agent', text: 'Three nearby sales put it closer to one million sixty-eight thousand. That could save about a thousand dollars a year. Would you like us to prepare the appeal?' },
  { at: '00:56', who: 'Jordan', text: 'Yes. Please go ahead.', fact: 'Authorization granted' },
];

export const receipts = [
  { at: '09:42:11', agent: 'Naive-Scout', action: 'Case opened', receipt: 'analysis-v1' },
  { at: '09:58:37', agent: 'Naive-Collect', action: 'External records gathered', receipt: 'E-01 · E-04' },
  { at: '10:11:04', agent: 'Naive-Verify', action: 'Eligibility verified', receipt: 'eligibility-report' },
  { at: '10:14:26', agent: 'Naive-Analyze', action: 'Valuation packet built', receipt: 'valuation-memo' },
  { at: '10:18:02', agent: 'Naive-Pay', action: 'Analysis deposit collected', receipt: 'stripe · $49' },
  { at: '10:22:19', agent: 'Naive-Draft', action: 'Filing-ready packet prepared', receipt: 'BOE-305.pdf' },
];

export const money = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: value % 1 ? 2 : 0,
}).format(value);
