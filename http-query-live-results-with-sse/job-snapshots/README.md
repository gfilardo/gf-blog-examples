# Job snapshots

From this folder: `nvm use`, `npm ci`, then `npm start`. Open http://127.0.0.1:3000 and press Start stream. Stop cancels the request. No bundler is required: an import map loads the installed SSE parser from the same server.

With warehouse and running/failed selected, the three snapshots show jobs 1 and 2 running, then only job 2 running, then job 2 failed. Billing jobs are excluded. The first snapshot arrives after one second so headers can be observed separately from body events. This finite scripted demo restarts on each request; it is not a live database feed.

- `server.mjs`: filtering, validation, framing, header flushing, timer cleanup and a simple slow-reader policy (disconnect rather than queue).
- `public/watch-jobs.mjs`: reusable Fetch reader, decoding, parsing, cancellation and application-level completion.
- `public/client.mjs`: small browser interface replacing the displayed selection.
- [resumable-stream](../resumable-stream/README.md): the complete earlier worktree example, including its custom parser, browser UI, deliberate drops, retry loop and tests. It has its own package: enter `../resumable-stream`, then run `nvm use`, `npm ci` and `npm start`.

The `complete` event is our application convention, not an SSE feature. Unexpected EOF is an error. This small client intentionally handles one response; it does not implement reconnection. The advanced demo demonstrates that separately with fixed readings, not job snapshots. Neither example promises exactly-once delivery or production-ready replay.

Corresponds to article slug `http-query-live-results-with-sse`. Run `npm test` in this folder for the snapshot checks. Run `npm test` separately inside `../resumable-stream` for the replay checks.
