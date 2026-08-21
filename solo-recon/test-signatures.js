/**
 * solo-recon/test-signatures.js
 * Sends one correctly-signed request and one tampered request at the
 * prototype in webhook-verifier.js, to prove verification actually works
 * both ways (not just that it accepts everything).
 */
const crypto = require('crypto');

const URL = 'http://localhost:4100/webhook-test';
const SECRET = 'northstar-shared-secret-v1';

function sign(payloadString, secret) {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

async function run() {
  const payload = JSON.stringify({ type: 'stock.updated', sku: 'SKU-1001', quantity: 41 });

  // 1. Valid signature -> should be ACCEPTED (200)
  const goodSig = sign(payload, SECRET);
  const r1 = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Warehouse-Signature': goodSig },
    body: payload,
  });
  console.log('Valid signature request  -> status', r1.status);

  // 2. Tampered payload, stale signature -> should be REJECTED (401)
  const tampered = JSON.stringify({ type: 'stock.updated', sku: 'SKU-1001', quantity: 999999 });
  const r2 = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Warehouse-Signature': goodSig }, // signature for the ORIGINAL payload
    body: tampered,
  });
  console.log('Tampered payload request -> status', r2.status);

  // 3. Missing signature entirely -> should be REJECTED (401)
  const r3 = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  console.log('Missing signature request -> status', r3.status);
}

run().catch((err) => {
  console.error('Test script failed:', err.message);
  process.exit(1);
});
