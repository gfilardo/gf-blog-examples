# GF blog examples

Runnable companions to Giovanni's blog, organized by article slug. Each runnable example owns its dependencies, runtime requirements, setup instructions and tests. There is no repository-wide package or required language; future examples can use a different stack.

| Example | What it demonstrates |
| --- | --- |
| [HTTP QUERY search](http-query-can-i-just-use-it/README.md) | Body-based product search |
| [Live job snapshots](http-query-live-results-with-sse/job-snapshots/README.md) | Filtered snapshots over one streaming response |
| [Reconnection and replay](http-query-live-results-with-sse/resumable-stream/README.md) | Connection drops, bounded retries and cursor-based resume |

## Running an example

Follow the README in the selected folder. The current examples each use Node.js 24 and have their own package and lockfile. For example:

```sh
cd http-query-can-i-just-use-it
nvm use
npm ci
npm test
npm start
```

Open http://127.0.0.1:3000. Stop the server before starting another example, or use `PORT=3001 npm start`. The SSE article folder contains two independent subfolders, `job-snapshots` and `resumable-stream`. Install and run each from its own folder; their parent is only an overview.

The current demos serve their browser pages and API from the same origin. No build step, API keys, external services or CDN scripts are needed. Tests exercise real HTTP requests, streaming, cancellation and replay.

These are educational examples, not a production service or library. Data is scripted; there is no authentication or persistence. The snapshot demo does not reconnect automatically. The advanced demo replays a fixed dataset and documents its cursor limitations.

This repository was created locally alongside `gf-blog`. It has no remote yet. Once published, link each article to its matching folder (prefer a tag or commit for a stable published example).
