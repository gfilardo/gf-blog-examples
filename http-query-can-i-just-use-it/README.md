# HTTP has QUERY now. Can I just use it?

From this folder: `nvm use`, `npm ci`, then `npm start`. Run `npm test` here to check the example. Open http://127.0.0.1:3000 and change the category or price filter.

`server.mjs` contains the Express QUERY route, JSON validation and a three-product catalogue. `public/client.mjs` sends the filter and consumes the JSON response. Books up to 25 returns one book; up to 40 returns two. Invalid input returns 400. Caching is disabled; no automatic retry behavior is claimed.

Corresponds to article slug `http-query-can-i-just-use-it`. Requires Node 24 and this folder's locked Express version.
