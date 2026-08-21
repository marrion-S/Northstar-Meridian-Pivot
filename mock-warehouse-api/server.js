/**
 * mock-warehouse-api/server.js
 *
 * Stands in for Northstar Retail Co.'s real warehouse system.
 * Supports BOTH integration styles so we can prove the pivot actually works:
 *   - GET  /warehouse/stock              (old world: something polls this)
 *   - POST /warehouse/register-webhook   (new world: register a push target)
 *   - POST /warehouse/admin/adjust       (simulate a stock change -> fires webhook)
 *
 * Webhook payloads are signed with HMAC-SHA256 so the receiver has something
 * real to verify (this is the "unfamiliar tool" from Day 1-2).
 */
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = 4000;
const WEBHOOK_SECRET = 'northstar-shared-secret-v1'; // shared out-of-band with subscriber

let stock = {
  'SKU-1001': 42,
  'SKU-2002': 7,
  'SKU-3003': 150,
};

let webhookSubscriber = null; // { url }

function sign(payloadString) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(payloadString).digest('hex');
}

// --- Old world: polling read ---
app.get('/warehouse/stock', (req, res) => {
  res.json({ stock, asOf: new Date().toISOString() });
});

// --- New world: register for pushes ---
app.post('/warehouse/register-webhook', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  webhookSubscriber = { url };
  console.log(`[warehouse] webhook registered -> ${url}`);
  res.json({ registered: true, url });
});

// --- Simulate a real stock change happening on Northstar's side ---
app.post('/warehouse/admin/adjust', async (req, res) => {
  const { sku, delta } = req.body;
  if (!sku || typeof delta !== 'number') {
    return res.status(400).json({ error: 'sku and numeric delta are required' });
  }
  stock[sku] = (stock[sku] || 0) + delta;

  const event = {
    type: 'stock.updated',
    sku,
    quantity: stock[sku],
    changedAt: new Date().toISOString(),
  };

  res.json({ ok: true, stock: stock[sku] });

  if (webhookSubscriber) {
    const payloadString = JSON.stringify(event);
    const signature = sign(payloadString);
    try {
      const resp = await fetch(webhookSubscriber.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Warehouse-Signature': signature,
        },
        body: payloadString,
      });
      console.log(`[warehouse] pushed ${event.type} for ${sku} -> ${resp.status}`);
    } catch (err) {
      console.error(`[warehouse] webhook push failed: ${err.message}`);
    }
  } else {
    console.log('[warehouse] no webhook subscriber registered, event not pushed');
  }
});

app.listen(PORT, () => console.log(`[warehouse] mock warehouse API listening on :${PORT}`));
