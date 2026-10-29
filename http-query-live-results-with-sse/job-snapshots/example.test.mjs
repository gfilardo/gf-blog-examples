import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp as streamApp } from './server.mjs';
import { watchJobs } from './public/watch-jobs.mjs';
async function serve(t, app) {
 const server=app.listen(0,'127.0.0.1'); await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 return `http://127.0.0.1:${server.address().port}`;
}
const query=(url,body)=>fetch(url,{method:'QUERY',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('job client consumes real snapshots, completion, validation and cancellation',async t=>{
 const url=await serve(t,streamApp({intervalMs:15}));
 const snapshots=[];
 await watchJobs(url+'/jobs/live',{project:'warehouse',statuses:['running','failed']},s=>snapshots.push(s.matches));
 assert.deepEqual(snapshots.map(s=>s.map(j=>j.id)),[[1,2],[2],[2]]);
 assert.equal(snapshots[2][0].status,'failed');
 await assert.rejects(watchJobs(url+'/jobs/live',{project:'warehouse',statuses:['unknown']},()=>{}),/400/);
 const controller=new AbortController();
 await assert.rejects(watchJobs(url+'/jobs/live',{project:'billing',statuses:['running']},()=>controller.abort(),controller.signal),{name:'AbortError'});
 for(const path of ['/','/client.mjs','/watch-jobs.mjs','/vendor/stream.js','/vendor/index.js']) assert.equal((await fetch(url+path)).status,200);
});
test('job client reports premature EOF rather than successful completion',async t=>{
 const app=streamApp();
 app.query('/truncated',(_req,res)=>res.type('text/event-stream').end('event: snapshot\ndata: {"matches":[]}\n\n'));
 const url=await serve(t,app);
 await assert.rejects(watchJobs(url+'/truncated',{},()=>{}),/without a complete event/);
});
