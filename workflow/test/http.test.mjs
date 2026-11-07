import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkflowService } from '../service.mjs';
import { workflowHttp } from '../http.mjs';
import { fixture } from './fixtures.mjs';

test('local HTTP rejects cross-site writes and tokenless case access',async()=>{
  const service=new WorkflowService({path:join(mkdtempSync(join(tmpdir(),'claimos-http-test-')),'cases.sqlite'),env:{}});
  const token='operator-test-token-at-least-24-characters';
  const server=createServer((req,res)=>workflowHttp(req,res,service,token));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api/workflow`;
  try{
    assert.equal((await fetch(base)).status,200);
    assert.equal((await fetch(base+'?resource=cases')).status,401);
    const headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
    assert.equal((await fetch(base+'?resource=cases',{method:'POST',headers:{...headers,origin:'https://attacker.example'},body:JSON.stringify(fixture())})).status,403);
    assert.equal((await fetch(base+'?resource=cases',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'text/plain'},body:'{}'})).status,415);
    const created=await fetch(base+'?resource=cases',{method:'POST',headers,body:JSON.stringify(fixture())});assert.equal(created.status,201);
    const result=await created.json(),id=result.case.id;
    assert.equal((await fetch(base+`?resource=run&id=${id}`,{method:'POST',headers,body:'{}'})).status,200);
    const record=await (await fetch(base+`?resource=cases&id=${id}`,{headers})).json();
    assert.equal(record.status,'AWAITING_AUTHORIZATION');
    assert.equal((await fetch(base+'?resource=cases&id=unknown',{headers})).status,404);
    assert.equal((await fetch(base+`?resource=artifact&id=${id}&artifactId=../../.env`,{headers})).status,404);
  }finally{await new Promise(resolve=>server.close(resolve));service.close();}
});
