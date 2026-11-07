import { CandidateSchema, DeskConfigSchema, SuppressionSchema, isoDate, qualify, applyReview, NaiveLlmClient, naiveCredentialsFromEnv } from '../taxappeal-qualify/dist/src/index.js';
import { CaseStore, digest } from './store.mjs';
import { buildEvidence, pythonRuntime } from './evidence.mjs';

export class WorkflowError extends Error {
  constructor(code, message, status = 422) { super(message); this.code=code; this.status=status; }
}
const required = (condition, message) => { if (!condition) throw new WorkflowError('INVALID_INPUT', message); };
const positive = value => Number.isFinite(value) && value > 0;
const today = () => new Intl.DateTimeFormat('en-CA',{ timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());

export function parseCaseInput(raw) {
  const candidate = CandidateSchema.safeParse(raw?.candidate), config = DeskConfigSchema.safeParse(raw?.config);
  required(candidate.success, 'Candidate does not match the Qualify handoff schema.');
  required(config.success, 'Desk config does not match the Qualify schema.');
  const c = candidate.data, cfg = config.data, e = raw.evidence, rules = raw.rules;
  required(c.jurisdictionId === 'FL-Lee' && cfg.jurisdiction.id === 'FL-Lee', 'The connected Evidence backend supports FL-Lee only.');
  required(!/placeholder/i.test(cfg.version), 'Replace the placeholder desk config with operator-reviewed Lee County rules.');
  required(typeof rules?.reviewedBy === 'string' && rules.reviewedBy.trim().length >= 2 && rules.reviewedBy.length <= 100, 'Provide who reviewed the desk rules.');
  required(isoDate.safeParse(rules?.reviewedOn).success && rules.reviewedOn <= today(), 'Provide a valid rule-review date.');
  required(Array.isArray(rules.sources) && rules.sources.length > 0 && rules.sources.length <= 20 && rules.sources.every(source => { try { const u = new URL(source); return u.protocol === 'https:' && source.length < 2000; } catch { return false; } }), 'Provide HTTPS references for the reviewed desk rules.');
  required(c.assessment.valuationDate === cfg.jurisdiction.valuationDate, 'Candidate and desk must use the same valuation date.');
  required(Object.values(c.provenance.sources).some(ref => typeof ref === 'string' && ref.trim()), 'Candidate must include source references from the public record.');
  required(cfg.llm.maxCostPerLeadUsd <= 1, 'The local integration limits a model review to a configured estimate of $1 per lead.');
  required(e && positive(e.justValue) && positive(e.countyLevel) && e.countyLevel <= 2, 'Evidence requires an explicit county just value and measured county level.');
  required(e.justValue === c.assessment.assessedValue, 'Capped/exempt property value differences require a specialist adapter; values cannot be substituted.');
  required(cfg.jurisdiction.valuationDate.endsWith('-01-01') && cfg.compRules.saleWindowAfterDays === 0, 'Florida Evidence requires a January 1 valuation and no post-valuation sales window.');
  required(cfg.compRules.armsLengthOnly && cfg.compRules.sameTypeOnly && cfg.compRules.minComps >= 3, 'The connected Evidence adapter requires at least three arm’s-length sales of the same property type.');
  required(!c.neighborhood || (positive(c.neighborhood.medianAssessmentRatio) && c.neighborhood.medianAssessmentRatio <= 2), 'Neighborhood assessment ratio must be positive and within the supported range.');
  required(c.physical.yearBuilt !== undefined && positive(c.physical.livingArea), 'Evidence requires the county-record area and year built.');
  required(!e.hearingDate || isoDate.safeParse(e.hearingDate).success, 'Hearing date must be a valid calendar date.');
  const peers = e.peers || [];
  required(Array.isArray(peers) && peers.length <= 200 && peers.every(p => positive(p.sqft) && positive(p.just_value) && typeof p.parcel_id === 'string'), 'Peer records require parcel_id, positive sqft and positive just_value.');
  const addresses = e.compAddresses || {};
  required(addresses && typeof addresses === 'object' && !Array.isArray(addresses) && Object.values(addresses).every(v => typeof v === 'string' && v.length < 500), 'Comparable addresses must be a map of identifiers to addresses.');
  return { candidate: c, config: cfg, suppression: SuppressionSchema.parse(raw.suppression || {}), rules: { reviewedBy: rules.reviewedBy.trim(), reviewedOn: rules.reviewedOn, sources: rules.sources }, evidence: { justValue:e.justValue, countyLevel:e.countyLevel, peers, compAddresses:addresses, hearingDate:e.hearingDate || null, generatePdf:e.generatePdf !== false } };
}

export class WorkflowService {
  constructor({ path, evidenceRunner = buildEvidence, env = process.env } = {}) {
    this.store = new CaseStore(path); this.evidenceRunner = evidenceRunner; this.env = env;
  }
  capabilities() {
    const credentials = naiveCredentialsFromEnv(this.env);
    return { mode:'LOCAL_REAL_WORKFLOW', jurisdiction:'FL-Lee', persistent:true,
      modules: { find:'not_received', qualify:'connected', signup:'authorization_upload', evidence:pythonRuntime() ? 'connected' : 'python_required', file:'not_received', chase:'not_received', escalate:'not_received', collect:'not_received' },
      naiveConfigured: Boolean(credentials.apiKey), modelConfigured: Boolean(this.env.QUALIFY_MODEL),
      externalActionsEnabled:false,
      message:'Runs imported case data through the connected modules. No synthetic fallback. Filing, outreach and payments are not connected.' };
  }
  create(raw) { const result = this.store.create(parseCaseInput(raw)); return { created:result.created, case:this.view(result.record) }; }
  require(id) { const record = this.store.get(id); if (!record) throw new WorkflowError('NOT_FOUND','Case not found.',404); return record; }
  view(record) {
    const { input, ...rest } = record;
    return { ...rest, address:input.candidate.situsAddress, parcelId:input.candidate.parcelId, owner:input.candidate.owner.names.join(' & '), ruleReview:input.rules, configVersion:input.config.version,
      artifacts:this.store.artifacts(record.id), events:this.store.events(record.id) };
  }
  list() { return this.store.list().map(r => ({ id:r.id,address:r.input.candidate.situsAddress,status:r.status,stage:r.stage,updatedAt:r.updatedAt,version:r.version })); }
  block(record, code, message, stage = record.stage) {
    record.status = 'BLOCKED'; record.stage = stage; record.blocker = { code, message };
    this.store.event(record.id,'blocked',message,{ code,stage }); return this.view(this.store.save(record));
  }
  async locked(id, action) {
    this.require(id);
    if (!this.store.acquire(id)) throw new WorkflowError('CASE_BUSY','A step is already running for this case. Refresh to see its result.',409);
    try { return await action(this.require(id)); } finally { this.store.release(id); }
  }
  async run(id) { return this.locked(id, r => this.advance(r)); }
  async advance(record) {
    if (!record.qualification) {
      const { apiKey, baseUrl } = naiveCredentialsFromEnv(this.env);
      const model = this.env.QUALIFY_MODEL || record.input.config.llm.model;
      if (record.input.config.llm.enabled && (!apiKey || !model)) return this.block(record,'NAIVE_NOT_CONFIGURED','This desk requires an LLM review. Configure the Naïve key and a review model, then run again.','qualify');
      this.store.event(record.id,'qualify_started','Running Smaran’s Qualify module on the imported record.',{ module:'taxappeal-qualify',configVersion:record.input.config.version });
      const llm = record.input.config.llm.enabled ? new NaiveLlmClient({ apiKey,baseUrl,fetch:(input,init) => fetch(input,{...init,signal:AbortSignal.timeout(30000)}) }) : null;
      record.qualification = await qualify(record.input.candidate, { config:record.input.config,today:today(),suppression:record.input.suppression,priorResults:new Map(),llm,models:{primary:model,escalation:this.env.QUALIFY_ESCALATION_MODEL || record.input.config.llm.escalationModel} });
      this.store.event(record.id,'qualified',record.qualification.summary,{ status:record.qualification.status,inputHash:record.qualification.audit.inputHash,model:record.qualification.llm?.model || null,reviewMode:llm ? 'naive' : 'rules_only' });
      this.store.save(record);
    }
    const result = record.qualification;
    if (result.status !== 'QUALIFIED') {
      record.status = result.status; record.stage = 'qualify'; record.blocker = { code:result.status,message:result.summary }; return this.view(this.store.save(record));
    }
    // Recheck timing, suppression and hard rules using the original module before any new handoff.
    const current = await qualify(record.input.candidate,{ config:record.input.config,today:today(),suppression:record.input.suppression,priorResults:new Map([[result.caseId,result]]),llm:null },{skipLlm:true});
    if (['REJECTED','INCOMPLETE','NEXT_CYCLE'].includes(current.status)) return this.block(record,'REQUALIFICATION_REQUIRED',current.summary,'qualify');
    if (!record.authorization) {
      record.status='AWAITING_AUTHORIZATION'; record.stage='signup'; record.blocker={code:'AUTHORIZATION_REQUIRED',message:'Attach an existing signed owner authorization and confirm it was reviewed. No signature is generated by this app.'}; return this.view(this.store.save(record));
    }
    if (!record.evidence) {
      if (record.input.evidence.hearingDate && record.input.evidence.hearingDate <= today()) return this.block(record,'HEARING_DATE_PASSED','The recorded hearing date has passed. Review the case timeline before building a current packet.','evidence');
      this.store.event(record.id,'evidence_started','Running Fra’s Python Evidence module with the qualified comparable sales.',{module:'taxappeal-evidence',sourceCommit:'51a8295'});
      let built;
      try { built = await this.evidenceRunner(record); }
      catch { return this.block(record,'EVIDENCE_FAILED','Evidence could not be generated. Check Python availability and the case’s comparable records.','evidence'); }
      const packet = built.packet;
      if (!packet || packet.case_id !== record.id || !['ready','thin','no_case'].includes(packet.status) || typeof built.html !== 'string') return this.block(record,'INVALID_EVIDENCE_RESULT','The Evidence module returned a mismatched case or invalid output.','evidence');
      this.store.transaction(() => {
        this.store.artifact(record.id,'packet_json','evidence-packet.json','application/json',JSON.stringify(packet,null,2));
        this.store.artifact(record.id,'packet_html','evidence-packet.html','text/html',built.html);
        this.store.artifact(record.id,'owner_request','owner-document-request.txt','text/plain',packet.owner_request || '');
        if (built.pdfBase64) this.store.artifact(record.id,'packet_pdf','evidence-packet.pdf','application/pdf',Buffer.from(built.pdfBase64,'base64'));
        record.evidence = packet;
        this.store.event(record.id,'evidence_generated','Evidence artifacts saved with checksums; no filing or owner message was sent.',{status:packet.status,requestedValue:packet.requested_just_value,pdfAvailable:Boolean(built.pdfBase64),artifacts:this.store.artifacts(record.id).map(a=>({kind:a.kind,sha256:a.sha256}))});
        this.store.save(record);
      });
    }
    if (record.evidence.status !== 'ready') return this.block(record,'EVIDENCE_REVIEW_REQUIRED',`Evidence is ${record.evidence.status}; it cannot proceed to filing.`,'evidence');
    record.status='EVIDENCE_GENERATED'; record.stage='file';
    record.blocker={code:'FILE_MODULE_MISSING',message:'Evidence documents are generated. Complete the checklist and connect the File backend before submission. No county filing has been made.'};
    return this.view(this.store.save(record));
  }
  async approve(id, note) {
    required(typeof note === 'string' && note.trim().length >= 5 && note.length < 2000,'Record why the qualification concerns are resolved.');
    return this.locked(id, async record => {
      if (record.qualification?.status !== 'NEEDS_REVIEW') throw new WorkflowError('INVALID_STATE','Only cases awaiting qualification review can be approved.',409);
      if (record.qualification.flags.includes('F_LLM_UNAVAILABLE')) throw new WorkflowError('MODEL_REVIEW_REQUIRED','Complete the configured model review instead of approving an unavailable reviewer.',409);
      record.qualification = await applyReview(record.qualification,{type:'approve',note},'local-operator');
      this.store.event(id,'qualification_approved','Operator approved the qualification concerns.',{note}); this.store.save(record);
      return this.advance(record);
    });
  }
  async authorize(id, input) {
    required(input?.reviewed === true && typeof input.signer === 'string' && input.signer.trim().length >= 2 && input.signer.length < 200,'Confirm the signer and that the existing signed document has been reviewed.');
    required(typeof input.contentBase64 === 'string' && input.contentBase64.length <= 1_500_000,'Authorization document is required and must be smaller than 1 MB.');
    const bytes=Buffer.from(input.contentBase64,'base64');
    const pdf=bytes.subarray(0,5).toString()==='%PDF-', png=bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a', jpeg=bytes[0]===0xff && bytes[1]===0xd8;
    required(bytes.length > 12 && bytes.length <= 1_000_000 && (pdf || png || jpeg),'Upload a PDF, PNG or JPEG authorization document.');
    return this.locked(id, async record => {
      if (record.qualification?.status !== 'QUALIFIED') throw new WorkflowError('INVALID_STATE','Qualify this case before attaching its authorization.',409);
      const artifact=this.store.artifact(id,'authorization',`owner-authorization.${pdf?'pdf':png?'png':'jpg'}`,pdf?'application/pdf':png?'image/png':'image/jpeg',bytes);
      if (!record.authorization) { record.authorization={signer:input.signer.trim(),reviewedBy:'local-operator',reviewedAt:new Date().toISOString(),artifactId:artifact.id,sha256:digest(bytes)}; this.store.event(id,'authorization_attached','An existing owner authorization was attached and reviewed by the operator.',{artifactId:artifact.id,sha256:artifact.sha256}); this.store.save(record); }
      return this.advance(record);
    });
  }
  close() { this.store.close(); }
}
