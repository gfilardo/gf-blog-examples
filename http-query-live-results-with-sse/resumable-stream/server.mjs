import express from 'express';
import { METHODS } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The HTTP parser must accept QUERY before any Express route can handle it.
if (!METHODS.includes('QUERY')) throw new Error('This Node runtime cannot accept QUERY. Use Node 24+.');

// A fixed dataset: ID n always identifies the same item, even after a restart.
export const items = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1, text: `Reading ${i + 1} · café ☕`, value: (i * 17) % 100,
}));

export function createApp({ intervalMs = 700 } = {}) {

  const app = express();
  app.use(express.json({ limit: '2kb' }));
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));

  // Both response styles share the same method guard, filter validation and read-only dataset.
  app.all(['/query', '/stream'], (req, res, next) => {
    if (req.method !== 'QUERY') return res.set('Allow', 'QUERY').status(405).end();
    const min = req.body?.min ?? 0;

    if (!Number.isInteger(min) || min < 0 || min > 99) {
      return res.status(400).json({ error: 'min must be an integer from 0 to 99' });
    }
    res.locals.matches = items.filter(item => item.value >= min);
    res.set('Cache-Control', 'no-store');
    next();
  });

  // app.all + explicit method guard makes the method handling visible.
  app.all('/query', (req, res) => res.json({ items: res.locals.matches }));

  app.all('/stream', (req, res) => {

    // The cursor is the last processed event ID, not a request ID or an exactly-once guarantee.
    const cursor = req.get('Last-Event-ID') ?? '0';
    if (!/^\d+$/.test(cursor) || Number(cursor) > items.length) {
      return res.status(400).json({ error: 'Invalid Last-Event-ID' });
    }
    // Replay works here because IDs and data are fixed. A changing dataset needs a retention/reset contract.
    const pending = res.locals.matches.filter(item => item.id > Number(cursor));

    res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Accel-Buffering': 'no' });
    res.flushHeaders(); // fetch() can resolve now, before the first body event.
    // The comment is not a data event; retry suggests a reconnect delay to the client.
    res.write(': connected\nretry: 1000\n\n');
    let sent = 0;
    let timer;

    const sendNext = () => {
      const item = pending.shift();
      // done is our finite-demo convention; SSE itself does not define a completion event.
      if (!item) return res.end('event: done\ndata: complete\n\n');
      const writable = res.write(`id: ${item.id}\nevent: reading\ndata: ${JSON.stringify(item)}\n\n`);
      sent++;
      // Break the socket on a later tick so the third complete event can arrive.
      if (req.body?.drop && sent === 3) {
        timer = setTimeout(() => res.destroy(), intervalMs);
      } else if (writable) {
        timer = setTimeout(sendNext, intervalMs);
      } else {
        // Pause production when the output buffer is full rather than building an unbounded queue.
        res.once('drain', scheduleNext);
      }
    };

    const scheduleNext = () => { timer = setTimeout(sendNext, intervalMs); };
    // Disconnects cancel both the scheduled event and any pending backpressure listener.
    res.on('close', () => { clearTimeout(timer); res.off('drain', scheduleNext); });
    scheduleNext();
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, '127.0.0.1', error => {
    if (error) throw error;
    console.log(`Demo: http://127.0.0.1:${port}`);
  });
}
