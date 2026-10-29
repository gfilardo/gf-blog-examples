import express from 'express';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function createApp({ intervalMs = 1000 } = {}) {
const app = express();
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
const products = [
  { id: 1, category: 'books', price: 18 },
  { id: 2, category: 'books', price: 35 },
  { id: 3, category: 'games', price: 24 },
];

app.use(express.json({ limit: '16kb' }));

app.query('/products/search', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { category, maxPrice } = req.body ?? {};
  if (typeof category !== 'string' ||
      typeof maxPrice !== 'number' ||
      !Number.isFinite(maxPrice) || maxPrice < 0) {
    return res.status(400).json({ error: 'Expected category and maxPrice' });
  }

  const matches = products.filter(product =>
    product.category === category && product.price <= maxPrice
  );
  res.json({ matches });
});

return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, '127.0.0.1', () => console.log(`Open http://127.0.0.1:${port}`));
}
