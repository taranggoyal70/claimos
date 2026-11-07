const $ = selector => document.querySelector(selector);
const labels={find:'Find',qualify:'Qualify',signup:'Sign up',evidence:'Evidence',file:'File',chase:'Chase',escalate:'Escalate',collect:'Collect'};
const moduleLabels={not_received:'Backend not received',connected:'Connected',authorization_upload:'Signed document upload',python_required:'Python required'};
const statusLabels={IMPORTED:'Imported',BLOCKED:'Blocked',QUALIFIED:'Qualified',NEEDS_REVIEW:'Needs operator review',INCOMPLETE:'Missing data',REJECTED:'Not eligible',NEXT_CYCLE:'Next filing window',AWAITING_AUTHORIZATION:'Owner authorization needed',EVIDENCE_GENERATED:'Evidence documents generated'};
let token='', selected=new URL(location.href).searchParams.get('case'), busy=false, capabilities;
const node=(tag,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
const money=value=>value==null?'Not available':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
function message(text,error=false){$('[data-workflow-message]').textContent=text;$('[data-workflow-message]').dataset.error=String(error);}
async function request(resource,options={}) {
  const { id,artifactId,...init }=options;
  const query=new URLSearchParams({resource,...(id?{id}:{}),...(artifactId?{artifactId}:{})});
  const response=await fetch(`/api/workflow?${query}`,{...init,headers:{...(init.body?{'content-type':'application/json'}:{}),...(token?{authorization:`Bearer ${token}`}:{})}});
  if(!response.ok){const result=await response.json();throw new Error(result.error?.message || 'The workflow request failed.');}
  return resource==='artifact'?response:response.json();
}
async function action(work) {
  if(busy)return; busy=true; message('Running the connected backend…');
  document.querySelectorAll('[data-workflow-workspace] button').forEach(b=>b.disabled=true);
  try { await work(); message('Saved. The case view reflects the backend’s result.'); }
  catch(error){message(error.message,true);}
  finally{busy=false;document.querySelectorAll('[data-workflow-workspace] button').forEach(b=>b.disabled=false);}
}
async function refresh() {
  const result=await request('cases'); const list=$('[data-workflow-cases]'); list.replaceChildren();
  if(!result.cases.length)list.append(node('p','No saved cases. Import a sourced record below.'));
  for(const record of result.cases){
    const button=node('button','','workflow-case-button');button.type='button';button.disabled=busy;button.setAttribute('aria-pressed',String(record.id===selected));
    button.append(node('strong',record.address),node('small',statusLabels[record.status]||record.status));
    button.addEventListener('click',()=>{if(!busy){selected=record.id;const url=new URL(location.href);url.searchParams.set('case',selected);history.replaceState(null,'',url);refresh().catch(e=>message(e.message,true));}});list.append(button);
  }
  if(selected)render(await request('cases',{id:selected}));
}
function render(record){
  const root=$('[data-workflow-detail]');root.replaceChildren();
  const head=node('div','','workflow-case-head'),copy=node('div');copy.append(node('span','Persisted case · Lee County','eyebrow'),node('h2',record.address),node('p',`${record.parcelId} · ${record.owner}`));head.append(copy,node('span',statusLabels[record.status]||record.status,'workflow-state'));root.append(head);
  root.append(node('p',`Current step: ${labels[record.stage]}. Updated ${new Date(record.updatedAt).toLocaleString()}.`,'workflow-help'));
  if(record.blocker)root.append(node('div',record.blocker.message,'workflow-blocker'));
  const actions=node('div','','workflow-actions'),run=node('button','Run connected steps →','btn primary');run.type='button';run.addEventListener('click',()=>action(async()=>{await request('run',{id:record.id,method:'POST',body:'{}'});await refresh();}));actions.append(run);root.append(actions);
  const q=record.qualification;
  if(q){
    const section=node('section','','workflow-section');section.append(node('h3','Qualification decision'),node('p',q.summary));
    if(q.economics){const stats=node('dl','','workflow-stats');for(const [label,value]of[['Annual savings estimate',money(q.economics.annualSavings)],['Expected company return',money(q.economics.ev)],['Success fee estimate',money(q.economics.fee)]]){const item=node('div');item.append(node('dt',label),node('dd',value));stats.append(item);}section.append(stats);}
    section.append(node('p',q.llm?.ran?`Naïve review completed with ${q.llm.model}.`:'Decision uses the configured deterministic rules; no model review is claimed.','workflow-help'));
    if(q.status==='NEEDS_REVIEW'){
      const label=node('label','Why are the qualification concerns resolved?','workflow-review-label'),note=node('textarea');note.rows=3;label.append(note);const approve=node('button','Record operator approval','btn');approve.type='button';approve.addEventListener('click',()=>action(async()=>{await request('review',{id:record.id,method:'POST',body:JSON.stringify({note:note.value})});await refresh();}));section.append(label,approve);
    }root.append(section);
  }
  if(q?.status==='QUALIFIED'&&!record.authorization){
    const section=node('section','','workflow-section');section.append(node('h3','Attach existing owner authorization'),node('p','This does not create an e-signature. Upload an existing signed PDF or image after reviewing its signer and scope.'));
    const form=node('form','','workflow-auth-form'),signer=node('input');signer.name='signer';signer.required=true;signer.maxLength=200;const signerLabel=node('label','Signer name');signerLabel.append(signer);
    const file=node('input');file.type='file';file.accept='.pdf,.png,.jpg,.jpeg';file.required=true;const fileLabel=node('label','Signed authorization, up to 1 MB');fileLabel.append(file);
    const check=node('input');check.type='checkbox';check.required=true;const confirm=node('label','','workflow-confirm');confirm.append(check,node('span','I reviewed this existing signed document, its signer, property, tax year and scope.'));
    form.append(signerLabel,fileLabel,confirm,node('button','Attach document and build evidence →','btn primary'));
    form.addEventListener('submit',event=>{event.preventDefault();action(async()=>{const upload=file.files[0];if(upload.size>1_000_000)throw new Error('Authorization must be smaller than 1 MB.');const bytes=new Uint8Array(await upload.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);await request('authorization',{id:record.id,method:'POST',body:JSON.stringify({signer:signer.value,reviewed:check.checked,contentBase64:btoa(binary)})});await refresh();});});section.append(form);root.append(section);
  }
  if(record.artifacts.length){
    const section=node('section','','workflow-section'),list=node('div','','workflow-artifacts');section.append(node('h3','Generated and uploaded documents'));
    for(const artifact of record.artifacts){const row=node('div','','workflow-artifact'),download=node('button','Download','btn');download.type='button';download.addEventListener('click',()=>action(async()=>{const response=await request('artifact',{id:record.id,artifactId:artifact.id});const url=URL.createObjectURL(await response.blob()),link=node('a');link.href=url;link.download=artifact.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}));row.append(node('strong',artifact.name),node('small',`SHA-256 ${artifact.sha256}`),download);list.append(row);}section.append(list);root.append(section);
  }
  if(record.evidence){const section=node('section','','workflow-section'),list=node('ul','','workflow-checklist');section.append(node('h3','Evidence checklist'),node('p',`Requested just value: ${money(record.evidence.requested_just_value)}. Valuation status: ${record.evidence.status}. This is not a filing receipt.`));for(const item of record.evidence.checklist){const row=node('li',`${item.status==='have'?'✓':'○'} ${item.item}`);row.append(node('small',`${item.status.replaceAll('_',' ')} · ${item.why}`));list.append(row);}section.append(list);root.append(section);}
  const events=node('section','','workflow-section');events.append(node('h3','Actual event trail'));
  for(const event of record.events){const row=node('article','','workflow-event');row.append(node('time',new Date(event.at).toLocaleString()),node('p',event.summary));events.append(row);}root.append(events);
  root.querySelectorAll('button').forEach(button=>button.disabled=busy);
}
async function start(){
  try{
    capabilities=await request('capabilities');$('[data-workflow-capabilities]').textContent=capabilities.message;
    if(capabilities.mode!=='LOCAL_REAL_WORKFLOW')return;
    if(!capabilities.naiveConfigured)$('[data-workflow-capabilities]').textContent+=' Naïve credentials are not configured; desks requiring model review will wait for setup.';
    $('[data-workflow-modules]').replaceChildren(...Object.entries(capabilities.modules).map(([step,status])=>{const item=node('div');item.append(node('b',labels[step]),node('small',moduleLabels[status]||status));return item;}));
    $('[data-workflow-workspace]').hidden=false;$('[data-workflow-login]').hidden=!capabilities.requiresToken;
    if(!capabilities.requiresToken)await refresh();
  }catch(error){message(error.message,true);}
}
$('[data-workflow-login]').addEventListener('submit',event=>{event.preventDefault();token=new FormData(event.currentTarget).get('token');event.currentTarget.reset();refresh().then(()=>message('Workbench unlocked.')).catch(e=>message(e.message,true));});
$('[data-workflow-refresh]').addEventListener('click',()=>{if(!busy)refresh().catch(e=>message(e.message,true));});
$('[data-workflow-import]').addEventListener('submit',event=>{
  event.preventDefault();const form=event.currentTarget;
  action(async()=>{
    const data=new FormData(form),file=data.get('candidate'),configFile=data.get('config');
    if(file.size>900_000||configFile.size>200_000)throw new Error('Candidate or config file exceeds the import limit.');
    let source,config;try{source=JSON.parse(await file.text());config=JSON.parse(await configFile.text());}catch{throw new Error('Candidate and config must be valid JSON files.');}
    const result=await request('cases',{method:'POST',body:JSON.stringify({candidate:source.candidate||source,config,rules:{reviewedBy:data.get('reviewedBy'),reviewedOn:data.get('reviewedOn'),sources:String(data.get('sources')).split(/\n/).map(v=>v.trim()).filter(Boolean)},evidence:{...(source.evidence||{}),justValue:Number(data.get('justValue')),countyLevel:Number(data.get('countyLevel')),hearingDate:data.get('hearingDate')||null}})});
    selected=result.case.id;const url=new URL(location.href);url.searchParams.set('case',selected);history.replaceState(null,'',url);await request('run',{id:selected,method:'POST',body:'{}'});await refresh();
  });
});
start();
