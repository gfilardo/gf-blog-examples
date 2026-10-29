# HTTP QUERY + SSE with Express

The earlier worktree demo, preserved as an advanced companion example. Its fixed readings illustrate cursor-based resume rather than the article’s job snapshots.

## Run

Use **Node 24** (this example declares Node >=24 <26).

```sh
cd http-query-live-results-with-sse/resumable-stream
nvm use
npm ci
npm start
```

Open http://127.0.0.1:3000. `PORT=3001 npm start` selects another port.
Run `npm test` in this directory for parser and real HTTP integration tests.
This folder owns its dependencies and tests independently of the other examples.

Press **Run QUERY** for JSON. Press **Start stream** for SSE, with intentional
socket drops enabled by default. Watch the event IDs continue on reconnection.
**Stop** aborts both an active request and any reconnect wait. Start begins a new
query from the beginning. Changing options applies to the next Start.

## Read the code

- `server.mjs`: Express routes, fixed dataset, cursor validation, SSE framing,
  deliberate socket termination and disconnect timer cleanup.
- `public/client.mjs`: Fetch, body consumption, AbortController, reconnect loop.
- `public/sse.mjs`: incremental UTF-8 decoding and SSE line/event parser.
- `public/index.html`: same-origin static page; no browser dependencies.

`QUERY` is a safe, idempotent HTTP method with a request body: these requests read
a dataset, without changing it. Idempotent does not mean every response must be
byte-identical. SSE (`text/event-stream`) is the response format, independent of
the request method. Native EventSource uses GET and does not support this QUERY
body, so the browser uses Fetch and implements reconnect itself.

`await fetch(...)` waits for response headers, not the entire response.
`await response.json()` consumes the whole body. Each `reader.read()` waits for
available bytes: transport chunks are not event boundaries. TextDecoder's
streaming mode preserves split UTF-8 sequences; the parser handles LF, CR and
CRLF, comments, multiline data, event types, IDs and retry fields. A truncated
event at EOF is discarded. The response stream is canceled/released on exit.

After each complete reading is processed, the client records its ID. A new QUERY
sends the identical body and `Last-Event-ID`. The server regenerates the remaining
fixed items with IDs greater than that cursor. This deterministic cursor strategy
has only 30 items and works across process restarts while the dataset stays
unchanged. It is replay/continuation, distinct from a transparent HTTP retry:
retrying an idempotent request does not itself recover a partially consumed body.
There is no claim of exactly-once delivery across browser crashes or side effects.

Retries use the server's `retry` hint, bounded exponential backoff (up to 10 seconds
plus jitter), and stop after eight consecutive failed attempts without progress.
A received reading resets the failure count. HTTP 4xx and unexpected successful
response formats stop retrying. A `done` event ends the finite stream normally.
The server clears its timer when the connection closes and waits for drain if
writes encounter backpressure.

## Runtime and scope

Express's [QUERY documentation](https://expressjs.com/en/5x/api/application/)
lists compatible runtimes as `>=20.19.3 <21 || >=22.2.0`. The Node
[20.19.3 release notes](https://nodejs.org/en/blog/release/v20.19.3) include the
HTTP method translation fix. Those are historical capability thresholds, not
this example's supported runtime range. Use Node 24 here; Node 25.9.0 was also
verified with real QUERY requests. Startup additionally checks `http.METHODS`.
Express's general Node minimum alone is insufficient to establish QUERY support.

This demo binds to loopback and serves the page and API from the same origin.
It has no persistence, authentication, cross-origin setup, proxy configuration,
or live changing dataset. Arbitrary QUERY methods may be rejected by older
runtimes or intermediaries. A real service needs query-scoped/versioned cursors,
a replay retention policy and an explicit stale-cursor response. A silent network
stall would also need an application idle timeout/heartbeat policy; this compact
demo reconnects on observed errors or EOF, not on a timeout.
