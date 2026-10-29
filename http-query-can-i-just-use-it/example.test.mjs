import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp as searchApp } from './server.mjs';
async function serve(t, app) {
 const server=app.listen(0,'127.0.0.1'); await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 return `http://127.0.0.1:${server.address().port}`;
}
const query=(url,body)=>fetch(url,{method:'QUERY',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('product search filters, validates, and serves the browser page',async t=>{
 const url=await serve(t,searchApp());
 for(const [filter,ids] of [[{category:'books',maxPrice:25},[1]],[{category:'books',maxPrice:40},[1,2]],[{category:'games',maxPrice:25},[3]]]) {
  const response=await query(url+'/products/search',filter);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual((await response.json()).matches.map(p=>p.id),ids);
 }
 const bad=await query(url+'/products/search',{maxPrice:-1});assert.equal(bad.status,400);await bad.text();
 assert.match(await (await fetch(url)).text(),/client.mjs/);
});
