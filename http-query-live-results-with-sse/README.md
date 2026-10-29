# Live updates with HTTP QUERY and server-sent events

Two independent examples accompany this article. Each subfolder has its own dependencies, lockfile, runtime settings and tests. There is nothing to install in this directory.

| Example | What it shows | After a disconnect |
| --- | --- | --- |
| [Job snapshots](job-snapshots/README.md) | A filtered job dashboard receiving three complete snapshots through one QUERY response. Each snapshot replaces the displayed list. | Reports the interruption; starting again restarts the scripted demo. |
| [Resumable stream](resumable-stream/README.md) | A stream of fixed readings with event IDs, deliberate connection drops and a reconnect loop. | Reconnects with the last processed ID and resumes the remaining readings. |

Start with **job-snapshots** for the article's dashboard example. Use **resumable-stream** to explore reconnection and replay separately; it uses a different dataset and is not an incremental version of the job dashboard.

## Run either example

Enter the chosen subfolder, then run:

```sh
nvm use
npm ci
npm test
npm start
```

Open http://127.0.0.1:3000. Stop one server before running the other, or use `PORT=3001 npm start`.

Both demos use scripted data. Neither provides production authentication, persistent event history or exactly-once delivery.
