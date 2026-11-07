import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function pythonRuntime() {
  for (const command of [process.env.CLAIMOS_PYTHON, 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python3'].filter(Boolean)) {
    const result = spawnSync(command, ['-c', 'import sys; print("ok" if sys.version_info >= (3,10) else "old")'], { encoding: 'utf8', timeout: 3000 });
    if (result.status === 0 && result.stdout.trim() === 'ok') return command;
  }
  return null;
}

export function evidenceInput(record) {
  const { candidate: c, config, evidence: options } = record.input;
  if (c.jurisdictionId !== 'FL-Lee' || config.jurisdiction.id !== 'FL-Lee') throw new Error('Evidence currently supports FL-Lee only.');
  if (config.jurisdiction.valuationDate.slice(5) !== '01-01' || config.compRules.saleWindowAfterDays !== 0) throw new Error('Florida Evidence requires a January 1 valuation and pre-valuation comparable sales. Review the desk config.');
  if (options.justValue !== c.assessment.assessedValue) throw new Error('Assessed and just value differ. Capped/exempt property economics require a desk-specific review; values will not be silently substituted.');
  const selected = new Set(record.qualification.valuation.compsUsed.map(comp => comp.compId));
  const sales = (c.comps || []).filter(comp => selected.has(comp.compId)).map(comp => ({
    parcel_id: comp.compId, address: options.compAddresses?.[comp.compId] || comp.compId,
    sale_date: comp.saleDate, sale_price: comp.price, sqft: comp.livingArea, year_built: comp.yearBuilt, arms_length: comp.armsLength,
  }));
  const transfer = c.transfer && c.transfer.date < c.assessment.valuationDate ? { date: c.transfer.date, price: c.transfer.price, arms_length: c.transfer.armsLength } : undefined;
  return {
    case_id: record.id, county: 'Lee', roll_year: Number(c.assessment.valuationDate.slice(0,4)), county_level: options.countyLevel,
    annual_savings: record.qualification.economics.annualSavings, petition_deadline: record.qualification.route?.deadline,
    subject: { parcel_id: c.parcelId, address: c.situsAddress, sqft: c.physical.livingArea, year_built: c.physical.yearBuilt, just_value: options.justValue, ...(transfer ? { last_sale: transfer } : {}) },
    sales, peers: options.peers || [],
    authorization: { reviewed:true,case_id:record.id,parcel_id:c.parcelId,roll_year:Number(c.assessment.valuationDate.slice(0,4)),document_sha256:record.authorization.sha256,signer:record.authorization.signer },
  };
}

export async function buildEvidence(record) {
  const python = pythonRuntime();
  if (!python) throw new Error('Python 3.10 or newer is required for Evidence. Set CLAIMOS_PYTHON to its executable.');
  const input = evidenceInput(record);
  return new Promise((resolve, reject) => {
    const child = spawn(python, [fileURLToPath(new URL('./evidence_bridge.py', import.meta.url))], { stdio: ['pipe','pipe','pipe'] });
    let stdout = '', stderr = '', settled = false;
    const finish = (error, result) => { if (settled) return; settled=true; clearTimeout(timer); error ? reject(error) : resolve(result); };
    const timer = setTimeout(() => { child.kill(); finish(new Error('Evidence build timed out; no filing was attempted.')); }, 90000);
    child.stdout.on('data', data => { stdout += data; if (stdout.length > 12_000_000) { child.kill(); finish(new Error('Evidence output exceeded the artifact limit.')); } });
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-4000); });
    child.on('error', () => finish(new Error('Evidence Python process could not start.')));
    child.on('close', code => {
      if (code !== 0) return finish(new Error('Evidence module failed. Check the case data and worker logs.'));
      try {
        const result = JSON.parse(stdout);
        if (!result.packet || !['ready','thin','no_case'].includes(result.packet.status) || typeof result.html !== 'string') throw new Error();
        finish(null, result);
      } catch { finish(new Error('Evidence returned an invalid result.')); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify({ case: input, hearing: record.input.evidence.hearingDate || null, pdf: record.input.evidence.generatePdf !== false }));
  });
}
