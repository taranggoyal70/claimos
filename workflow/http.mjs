import { timingSafeEqual } from 'node:crypto';
import { WorkflowError } from './service.mjs';

const respond = (res, status, data) => {
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff' });
  res.end(JSON.stringify(data));
};
async function body(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new WorkflowError('UNSUPPORTED_MEDIA_TYPE','Send application/json.',415);
  let size=0; const chunks=[];
  for await (const chunk of req) { size+=chunk.length; if(size>2_000_000) throw new WorkflowError('PAYLOAD_TOO_LARGE','Request exceeds 2 MB.',413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new WorkflowError('INVALID_JSON','The uploaded package is not valid JSON.',400); }
}
export async function workflowHttp(req,res,service,token='') {
  try {
    const host=String(req.headers.host || '');
    if (!/^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(host)) throw new WorkflowError('LOCAL_ONLY','The local workbench only accepts loopback requests.',403);
    const origin=req.headers.origin;
    if ((origin && origin !== `http://${host}`) || req.headers['sec-fetch-site']==='cross-site') throw new WorkflowError('ORIGIN_REJECTED','Open the workbench directly on localhost.',403);
    const url=new URL(req.url,`http://${host}`), resource=url.searchParams.get('resource') || 'capabilities', id=url.searchParams.get('id');
    if(req.method==='GET' && resource==='capabilities') return respond(res,200,{...service.capabilities(),requiresToken:Boolean(token)});
    if(token) {
      const provided=Buffer.from(String(req.headers.authorization || '').replace(/^Bearer /,'')), expected=Buffer.from(token);
      if(provided.length!==expected.length || !timingSafeEqual(provided,expected)) throw new WorkflowError('UNAUTHORIZED','Enter the configured local operator token.',401);
    }
    if(req.method==='GET' && resource==='cases') return respond(res,200,id ? service.view(service.require(id)) : {cases:service.list()});
    if(req.method==='GET' && resource==='artifact') {
      service.require(id); const artifact=service.store.download(id,url.searchParams.get('artifactId'));
      if(!artifact) throw new WorkflowError('NOT_FOUND','Artifact not found.',404);
      res.writeHead(200,{'content-type':artifact.mime,'content-disposition':`attachment; filename="${artifact.name}"`,'content-security-policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'",'x-content-type-options':'nosniff','cache-control':'no-store','x-artifact-sha256':artifact.sha256});
      return res.end(Buffer.from(artifact.bytes));
    }
    if(req.method==='POST') {
      const input=await body(req);
      if(resource==='cases') { const result=service.create(input); return respond(res,result.created?201:200,result); }
      if(resource==='run') return respond(res,200,await service.run(id));
      if(resource==='review') return respond(res,200,await service.approve(id,input.note));
      if(resource==='authorization') return respond(res,200,await service.authorize(id,input));
    }
    throw new WorkflowError('NOT_FOUND','Workflow endpoint not found.',404);
  } catch(error) {
    if(error instanceof WorkflowError) return respond(res,error.status,{error:{code:error.code,message:error.message}});
    console.error('Workflow request failed:',error.name);
    return respond(res,500,{error:{code:'WORKFLOW_FAILED',message:'The step failed. Saved case data and prior artifacts are preserved; check the local worker logs.'}});
  }
}
