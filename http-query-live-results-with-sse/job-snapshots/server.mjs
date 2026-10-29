import express from 'express';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function createApp({ intervalMs = 1000 } = {}) {
const app = express();
// Serve the page and API from one origin so this demo needs no CORS setup.
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
app.use(express.json({ limit: '16kb' }));
app.use('/vendor', express.static(fileURLToPath(new URL('./node_modules/eventsource-parser/dist/', import.meta.url))));

// QUERY supplies the filter; SSE determines the response format.
app.query('/jobs/live', (req, res) => {
  // Validate before sending stream headers, while an ordinary 400 response is still possible.
  const { project, statuses } = req.body ?? {};
  if (typeof project !== 'string' || !Array.isArray(statuses) ||
      !statuses.length || !statuses.every(status =>
        ['queued', 'running', 'completed', 'failed'].includes(status))) {
    return res.status(400).json({ error: 'Expected project and valid statuses' });
  }

  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  // Let Fetch resolve with the headers before the first snapshot is produced.
  res.flushHeaders();

  // Scripted snapshots restart per request; this is not a live feed or retained event history.
  const states = [
    ['running', 'running'],
    ['completed', 'running'],
    ['completed', 'failed'],
  ];
  let index = 0;
  let timer;
  // A closed tab or aborted Fetch must also stop server-side work.
  res.once('close', () => clearInterval(timer));

  timer = setInterval(() => {
    const jobs = [
      { id: 1, project: 'warehouse', status: states[index][0] },
      { id: 2, project: 'warehouse', status: states[index][1] },
      { id: 3, project: 'billing', status: 'running' },
    ];
    // Reevaluate membership: a completed job leaves a running-or-failed selection.
    const matches = jobs.filter(job =>
      job.project === project && statuses.includes(job.status)
    );
    const data = JSON.stringify({ matches });
    // Each write adds an SSE event to the same response; the blank line terminates the event.
    const accepted = res.write(`event: snapshot\ndata: ${data}\n\n`);
    index += 1;

    // This tiny example disconnects slow consumers instead of queuing more data.
    if (!accepted) {
      clearInterval(timer);
      res.destroy();
      return;
    }
    // Our custom complete event distinguishes a normal finish from unexpected EOF.
    if (index === states.length) {
      clearInterval(timer);
      res.end('event: complete\ndata: {}\n\n');
    }
  }, intervalMs);
});

return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, '127.0.0.1', () => console.log(`Open http://127.0.0.1:${port}`));
}
