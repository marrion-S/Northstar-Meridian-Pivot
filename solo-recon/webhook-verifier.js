/**
 * solo-recon/webhook-verifier.js
 * ASSIGNMENT 1 — Day 1-2 solo mini-prototype
 * Unfamiliar tool assigned: webhook signature verification (HMAC-SHA256)
 *
 * Goal: prove I can receive a webhook and CONFIRM it actually came from the
 * sender (not spoofed), before trusting the payload. No teammate/instructor
 * how-to used — see docs/01-Learning-and-Blocker-Journal.md for the record
 * of blockers hit and how they were resolved solo.
 *
 * Run: node solo-recon/webhook-verifier.js
 * Test: node solo-recon/test-signatures.js
 */
const express = require('express');
const crypto = require('crypto');

const PORT = 4100;
const SHARED_SECRET = 'northstar-shared-secret-v1';

const app = express();

// IMPORTANT (blocker #1 in the journal): signature must be computed over the
// RAW request body bytes, not the parsed/re-serialized JSON, or the hash
// won't match. So we capture the raw body ourselves instead of using
// express.json() directly.
app.use(express.raw({ type: 'application/json' }));

function isValidSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // IMPORTANT (blocker #2 in the journal): use a timing-safe comparison,
  // not `===`, so verification isn't vulnerable to a timing attack.
  const expectedBuf = Buffer.from(expected, 'utf8');
  const givenBuf = Buffer.from(signatureHeader, 'utf8');

  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}

app.post('/webhook-test', (req, res) => {
  const signature = req.get('X-Warehouse-Signature');
  const rawBody = req.body; // Buffer, thanks to express.raw()

  if (!isValidSignature(rawBody, signature, SHARED_SECRET)) {
    console.log('[solo-recon] REJECTED — invalid or missing signature');
    return res.status(401).json({ error: 'invalid signature' });
  }

  const payload = JSON.parse(rawBody.toString('utf8'));
  console.log('[solo-recon] ACCEPTED —', payload);
  res.status(200).json({ received: true });
});

app.listen(PORT, () => console.log(`[solo-recon] webhook-verifier listening on :${PORT}`));

module.exports = { isValidSignature };
