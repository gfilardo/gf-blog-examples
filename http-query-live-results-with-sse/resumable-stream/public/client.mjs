import { readSSE } from './sse.mjs';
const $ = id => document.getElementById(id);
const log = message => { $('events').textContent = ($('events').textContent + message + '\n').slice(-16000); };
const body = () => JSON.stringify({ min: Number($('min').value), drop: $('drop').checked });
let active;

$('once').onclick = async () => {
  $('json').textContent = 'Waiting for headers…';
  try {
    const response = await fetch('/query', { method: 'QUERY', headers: { 'Content-Type': 'application/json' }, body: body() });
    // fetch resolves when headers arrive; json() waits for and parses the entire body.
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    $('json').textContent = JSON.stringify(await response.json(), null, 2);
  } catch (error) { $('json').textContent = error.message; }
};

// Stop must interrupt the reconnect delay as well as an in-flight request.
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

$('stop').onclick = () => active?.abort();
$('start').onclick = async () => {
  if (active) return;
  const controller = active = new AbortController();
  const { signal } = controller;
  const query = body(); // Keep query identical on reconnect: IDs belong to this query.
  let lastId = '', retryMs = 1000, failures = 0, complete = false;
  $('events').textContent = '';
  $('start').disabled = true; $('stop').disabled = false;
  try {
    // Fetch does not reconnect automatically: each iteration opens a new response.
    while (!signal.aborted && !complete) {
      let fatal = false;
      try {
        log(`QUERY /stream · resume after ${lastId || 'beginning'}`);
        const response = await fetch('/stream', {
          method: 'QUERY', body: query, signal,
          // Send the last processed cursor with the unchanged filter so the server can resume.
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(lastId ? { 'Last-Event-ID': lastId } : {}) },
        });
        log(`Headers received · HTTP ${response.status}`);
        if (!response.ok || !response.headers.get('content-type')?.startsWith('text/event-stream')) {
          // This demo stops on client errors or an unexpected successful format, but retries server errors.
          fatal = response.status < 500;
          await response.body?.cancel();
          throw new Error(`Unexpected response: HTTP ${response.status}`);
        }
        // The parser delivers complete events; transport chunks are never treated as messages.
        await readSSE(response, event => {
          if (event.type === 'done') { complete = true; log('Complete.'); return; }
          if (event.type === 'reading') {
            const item = JSON.parse(event.data);
            log(`#${event.id} ${item.text} — value ${item.value}`);
            lastId = event.id; // Advance only after a complete event has been processed.
            // Progress resets the consecutive-failure budget, even if this response later drops.
            failures = 0;
          }
        }, ms => { retryMs = Math.min(10000, Math.max(500, ms)); }, lastId);
        // EOF without done is an interruption, so the next request resumes from the saved ID.
        if (!complete) log('Connection ended before completion.');
      } catch (error) {
        if (signal.aborted) break;
        log(error.message);
        if (fatal) break;
      }
      if (!complete && !signal.aborted) {
        if (++failures > 8) { log('Retry limit reached. Press Start to try again.'); break; }
        // Bound exponential backoff and add jitter to avoid an immediate synchronized retry loop.
        const wait = Math.min(10000, retryMs * 2 ** (failures - 1)) + Math.random() * 250;
        log(`Reconnect in ${(wait / 1000).toFixed(1)}s…`);
        await delay(wait, signal);
      }
    }
  } catch (error) { if (!signal.aborted) log(error.message); }
  finally {
    if (signal.aborted) log('Stopped.');
    active = null; $('start').disabled = false; $('stop').disabled = true;
  }
};
