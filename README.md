# GF blog examples

Runnable companions to Giovanni's blog, organized by article slug. Each runnable example owns its dependencies, runtime requirements, setup instructions and tests. There is no repository-wide package or required language; examples can use different stacks.

| Article | Example | Description |
| --- | --- | --- |
| HTTP has QUERY now. Can I just use it? | [HTTP QUERY search](http-query-can-i-just-use-it/README.md) | Body-based product search. |
| Live updates with HTTP QUERY and server-sent events | [Job snapshots](http-query-live-results-with-sse/job-snapshots/README.md) | A filtered job dashboard receiving complete snapshots over one streaming response. |
| Live updates with HTTP QUERY and server-sent events | [Resumable stream](http-query-live-results-with-sse/resumable-stream/README.md) | Connection drops, bounded retries and cursor-based replay. |

## Running an example

Follow the README in the selected example's folder for prerequisites, installation, commands and tests. Each example runs independently; there is no root-level setup step.
