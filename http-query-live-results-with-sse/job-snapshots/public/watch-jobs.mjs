import { EventSourceParserStream } from 'eventsource-parser/stream';

// Consume one response. Reconnection, if wanted, belongs to the caller.
export async function watchJobs(url, filter, onSnapshot, signal) {
  // This await waits for status and headers, not for all the events.
  const response = await fetch(url, {
    method: 'QUERY',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(filter),
    signal,
  });

  // Reject HTTP errors or a non-SSE response before attempting to parse its body.
  const type = response.headers.get('content-type')
    ?.split(';')[0].trim().toLowerCase();
  if (!response.ok || type !== 'text/event-stream' || !response.body) {
    await response.body?.cancel();
    throw new Error(`Expected an event stream; received HTTP ${response.status}`);
  }

  // Decode split UTF-8 bytes, then assemble complete SSE events across arbitrary chunk boundaries.
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())
    .getReader();

  try {
    while (true) {
      const { value: event, done } = await reader.read();
      // Only our application-level complete event counts as success; EOF alone does not.
      if (done) throw new Error('Stream ended without a complete event');
      if (event.event === 'complete') return;
      // Each snapshot replaces the view; it is not a delta to merge into previous state.
      if (event.event === 'snapshot') onSnapshot(JSON.parse(event.data));
    }
  } finally {
    // On completion, error or abort, cancel remaining data and release the reader lock.
    try { await reader.cancel(); }
    finally { reader.releaseLock(); }
  }
}
