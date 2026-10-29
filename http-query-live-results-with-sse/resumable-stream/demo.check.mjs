import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp, items } from './server.mjs';
import { createSSEParser, readSSE } from './public/sse.mjs';

test('SSE handles every byte split, CRLF, comments, multiline data and incomplete EOF', async () => {
  const source = ': heartbeat\r\nretry: 1200\r\nid: 7\r\nevent: reading\r\ndata: café ☕\r\ndata: second\r\n\r\ndata: unfinished';
  const bytes = new TextEncoder().encode(source);
  for (let split = 1; split < bytes.length; split++) {
    const events = [], retries = [];
    const response = new Response(new ReadableStream({ start(c) {
      c.enqueue(bytes.slice(0, split)); c.enqueue(bytes.slice(split)); c.close();
    } }));
    await readSSE(response, e => events.push(e), r => retries.push(r));
    assert.deepEqual(events, [{ type: 'reading', data: 'café ☕\nsecond', id: '7' }]);
    assert.deepEqual(retries, [1200]);
  }
  const events = [];
  const parse = createSSEParser(e => events.push(e));
  for (const char of 'id: 2\rdata: a\r\rid: bad\0id\ndata: b\n\nid:\ndata:\n\n') parse(char);
  assert.deepEqual(events.map(e => [e.id, e.data]), [['2', 'a'], ['2', 'b'], ['', '']]);
});

test('real QUERY: JSON, repeated socket drops, resume, validation, abort', async t => {
  const server = createApp({ intervalMs: 10 }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const query = (path, body, cursor, signal) => fetch(url + path, {
    method: 'QUERY', headers: { 'Content-Type': 'application/json', ...(cursor ? { 'Last-Event-ID': cursor } : {}) },
    body: JSON.stringify(body), signal,
  });
  const json = await query('/query', { min: 50 });
  assert.equal(json.status, 200);
  assert.deepEqual((await json.json()).items, items.filter(i => i.value >= 50));
  let cursor = '', done = false, connections = 0;
  const received = [];
  while (!done && connections++ < 12) {
    const response = await query('/stream', { min: 0, drop: true }, cursor);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    try {
      await readSSE(response, e => {
        if (e.type === 'done') done = true;
        else { received.push(JSON.parse(e.data)); cursor = e.id; }
      });
    } catch (error) { assert.equal(error.name, 'TypeError'); }
  }
  assert.equal(done, true);
  assert.equal(connections, 11);
  assert.deepEqual(received, items);
  const invalid = await query('/stream', {}, '999');
  assert.equal(invalid.status, 400); await invalid.text();
  const badBody = await query('/query', { min: -1 });
  assert.equal(badBody.status, 400); await badBody.text();
  const wrongMethod = await fetch(url + '/stream');
  assert.equal(wrongMethod.status, 405);
  const controller = new AbortController();
  const stream = await query('/stream', {}, '', controller.signal);
  controller.abort();
  await assert.rejects(readSSE(stream, () => {}), { name: 'AbortError' });
  assert.equal((await fetch(url)).status, 200);
});
