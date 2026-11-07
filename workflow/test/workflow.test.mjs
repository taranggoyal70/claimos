import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkflowService, parseCaseInput } from '../service.mjs';
import { fixture, authorization } from './fixtures.mjs';

const open=options=>new WorkflowService({path:join(mkdtempSync(join(tmpdir(),'claimos-workflow-test-')),'cases.sqlite'),env:{},...options});
test('real module handoff creates actual artifacts, survives restart and never files',async()=>{
  const path=join(mkdtempSync(join(tmpdir(),'claimos-persist-test-')),'cases.sqlite');
  let service=new WorkflowService({path,env:{}});
  const raw=fixture(),first=service.create(raw);
  assert.equal(service.create(raw).case.id,first.case.id);
  assert.equal(service.create(raw).created,false);
  let record=await service.run(first.case.id);
  assert.equal(record.qualification.status,'QUALIFIED');assert.equal(record.status,'AWAITING_AUTHORIZATION');
  assert.equal(record.artifacts.length,0);
  record=await service.authorize(record.id,authorization);
  assert.equal(record.status,'EVIDENCE_GENERATED');assert.equal(record.stage,'file');assert.equal(record.blocker.code,'FILE_MODULE_MISSING');
  assert.equal(record.evidence.status,'ready');assert.equal(record.evidence.parcel_id,raw.candidate.parcelId);
  assert.equal(record.evidence.checklist.find(item=>item.source==='sign_up').status,'have');
  assert.equal(record.evidence.authorization.document_sha256,record.authorization.sha256);
  assert.ok(record.artifacts.some(a=>a.kind==='packet_html'));
  const html=service.store.download(record.id,record.artifacts.find(a=>a.kind==='packet_html').id);
  assert.match(Buffer.from(html.bytes).toString(),/Comparable sales/);
  assert.match(Buffer.from(html.bytes).toString(),new RegExp(String(record.evidence.requested_just_value).slice(0,3)));
  assert.equal(record.events.filter(e=>e.type==='evidence_generated').length,1);
  const ids=record.artifacts.map(a=>a.id);
  await service.run(record.id);
  assert.deepEqual(service.view(service.require(record.id)).artifacts.map(a=>a.id),ids);
  assert.equal(service.store.events(record.id).filter(e=>e.type==='evidence_generated').length,1);
  service.close();service=new WorkflowService({path,env:{}});
  assert.equal(service.view(service.require(record.id)).status,'EVIDENCE_GENERATED');assert.equal(service.store.artifacts(record.id).length,4);
  service.close();
});
test('requires real config, source references and matching Florida value semantics',()=>{
  const wrong=fixture();wrong.config.version='placeholder-2026';assert.throws(()=>parseCaseInput(wrong),/placeholder/);
  const other=fixture();other.candidate.jurisdictionId='CA-SF';assert.throws(()=>parseCaseInput(other),/FL-Lee/);
  const capped=fixture();capped.evidence.justValue+=1;assert.throws(()=>parseCaseInput(capped),/Capped/);
  const noSources=fixture();noSources.candidate.provenance.sources={};assert.throws(()=>parseCaseInput(noSources),/source references/);
  const postValuation=fixture();postValuation.config.compRules.saleWindowAfterDays=90;assert.throws(()=>parseCaseInput(postValuation),/January 1/);
});
test('missing required Naive credentials block rather than invoke a heuristic',async()=>{
  const service=open(),input=fixture();input.config.llm.enabled=true;input.config.llm.model='required-model';
  const record=await service.run(service.create(input).case.id);
  assert.equal(record.status,'BLOCKED');assert.equal(record.blocker.code,'NAIVE_NOT_CONFIGURED');assert.equal(record.qualification,null);assert.equal(record.artifacts.length,0);service.close();
});
test('authorization is explicit, binary-validated and cannot bypass qualification',async()=>{
  const service=open(),record=service.create(fixture()).case;
  await assert.rejects(service.authorize(record.id,authorization),/Qualify this case/);
  await service.run(record.id);
  await assert.rejects(service.authorize(record.id,{...authorization,reviewed:false}),/Confirm/);
  await assert.rejects(service.authorize(record.id,{...authorization,contentBase64:Buffer.from('<script>unsafe</script>').toString('base64')}),/PDF, PNG/);
  service.close();
});
test('thin evidence, a failed worker and a mismatched case never reach file',async()=>{
  for(const runner of [async()=>{throw new Error('offline');},async()=>({packet:{case_id:'another-case',status:'ready'},html:'bad'})]){
    const service=open({evidenceRunner:runner}),id=service.create(fixture()).case.id;await service.run(id);
    const result=await service.authorize(id,authorization);assert.equal(result.status,'BLOCKED');assert.equal(result.stage,'evidence');assert.equal(result.artifacts.length,1);service.close();
  }
});
test('concurrent runs acquire a durable lease and produce one evidence handoff',async()=>{
  let unblock,calls=0;
  const service=open({evidenceRunner:async r=>{calls++;await new Promise(resolve=>unblock=resolve);return {packet:{case_id:r.id,status:'thin',checklist:[],owner_request:''},html:'<h1>Thin evidence</h1>'};}});
  const id=service.create(fixture()).case.id;await service.run(id);
  const pending=service.authorize(id,authorization);
  while(!unblock)await new Promise(resolve=>setTimeout(resolve,5));
  await assert.rejects(service.run(id),error=>error.code==='CASE_BUSY');unblock();
  const result=await pending;assert.equal(calls,1);assert.equal(result.blocker.code,'EVIDENCE_REVIEW_REQUIRED');service.close();
});
test('deadlines are rechecked on every handoff',async()=>{
  const service=open(),id=service.create(fixture()).case.id;await service.run(id);
  const record=service.require(id);record.input.config.routes.forEach(r=>{r.opens='2020-01-01';r.closes='2020-02-01';});service.store.save(record);
  const result=await service.authorize(id,authorization);assert.equal(result.stage,'qualify');assert.equal(result.blocker.code,'REQUALIFICATION_REQUIRED');assert.equal(result.evidence,null);service.close();
});
test('an interrupted artifact commit rolls back the entire bundle and can be retried',async()=>{
  const service=open(),id=service.create(fixture()).case.id;await service.run(id);
  const write=service.store.artifact.bind(service.store);let fail=true;
  service.store.artifact=(...args)=>{if(fail&&args[1]==='packet_html')throw new Error('Simulated disk failure');return write(...args);};
  await assert.rejects(service.authorize(id,authorization),/Simulated disk failure/);
  assert.deepEqual(service.store.artifacts(id).map(a=>a.kind),['authorization']);
  assert.equal(service.require(id).evidence,null);
  fail=false;const result=await service.run(id);assert.equal(result.status,'EVIDENCE_GENERATED');
  assert.equal(result.events.filter(e=>e.type==='evidence_generated').length,1);service.close();
});
