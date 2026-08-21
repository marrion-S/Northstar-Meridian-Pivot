/**
 * inventory-sync-service/webhookReceiver.js
 * ASSIGNMENT 2 — Day 5 pivoted deliverable
 *
 * Replaces deprecated/pollWorker.js. Reuses the exact verification approach
 * proven solo on Day 1-2 (raw-body HMAC + timing-safe compare) instead of
 * re-deriving it under deadline pressure — that's the payoff of the solo
 * recon phase.
 */
const express = require('express');
const crypto = require('crypto');
const cache = require('./cache');

const SHARED_SECRET =
  process.env.WEBHOOK_SECRET || 'northstar-shared-secret-v1';

const router = express.Router();

router.use(express.raw({ type: 'application/json' }));

function isValidSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const givenBuf = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}

router.post('/stock-update', (req, res) => {
  const signature = req.get('X-Warehouse-Signature');
  const rawBody = req.body;

  if (!isValidSignature(rawBody, signature, SHARED_SECRET)) {
    console.log('[webhook] REJECTED — invalid or missing signature');
    return res.status(401).json({ error: 'invalid signature' });
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  if (event.type !== 'stock.updated' || !event.sku || typeof event.quantity !== 'number') {
    return res.status(400).json({ error: 'malformed stock.updated event' });
  }

  cache.set(event.sku, event.quantity);
  console.log(`[webhook] cache updated: ${event.sku} = ${event.quantity}`);
  res.status(200).json({ received: true });
});

module.exports = router;
