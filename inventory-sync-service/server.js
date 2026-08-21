/**
 * inventory-sync-service/server.js
 *
 * Current (post-pivot) entrypoint for the Northstar inventory sync service.
 *
 * Original spec (Day 3):  poll warehouse API every 5 min -> cache -> query endpoint
 * Current spec  (Day 5):  receive signed webhook push     -> cache -> query endpoint
 *
 * The query endpoint's contract is untouched by design — see
 * docs/02-Scope-Delta-Analysis.md, "Architectural integrity" section.
 */
const express = require('express');
const cache = require('./cache');
const webhookReceiver = require('./webhookReceiver');

const PORT = 4200;
const WAREHOUSE_BASE = 'http://localhost:4000';

const app = express();

// --- New (Day 5): push events land here instead of a poll loop ---
app.use('/webhooks', webhookReceiver);

// --- Unchanged since Day 3: this is the endpoint the support tool calls ---
app.get('/stock/:sku', (req, res) => {
  const quantity = cache.get(req.params.sku);
  if (quantity === null) {
    return res.status(404).json({ error: `no cached stock for ${req.params.sku}` });
  }
  res.json({ sku: req.params.sku, quantity });
});

app.get('/stock', (req, res) => {
  res.json(cache.getAll());
});

async function registerWithWarehouse() {
  const webhookUrl = `http://localhost:${PORT}/webhooks/stock-update`;
  try {
    const resp = await fetch(`${WAREHOUSE_BASE}/warehouse/register-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    if (!resp.ok) throw new Error(`registration returned ${resp.status}`);
    console.log(`[inventory-sync] registered ${webhookUrl} with warehouse`);
  } catch (err) {
    console.error('[inventory-sync] failed to register webhook:', err.message);
  }
}

async function seedInitialCache() {
  // One-time bootstrap read on boot, NOT a recurring poll — the ongoing
  // sync mechanism is push, this just avoids an empty cache before the
  // first webhook arrives.
  try {
    const resp = await fetch(`${WAREHOUSE_BASE}/warehouse/stock`);
    const { stock } = await resp.json();
    cache.setBulk(stock);
    console.log('[inventory-sync] seeded initial cache:', stock);
  } catch (err) {
    console.error('[inventory-sync] initial seed failed:', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`[inventory-sync] listening on :${PORT}`);
  await seedInitialCache();
  await registerWithWarehouse();
});
