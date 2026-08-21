# The Meridian Pivot — Completed Sprint

Working submission for the Northstar Retail Co. (Sprint 2) simulation.

## How to run it yourself

```bash
npm install                                  # from this folder — installs express once for everyone

# Day 1-2 prototype (standalone, doesn't need the other services)
node solo-recon/webhook-verifier.js &
node solo-recon/test-signatures.js           # expect: 200, 401, 401

# Full pivoted system (Day 5 current state)
node mock-warehouse-api/server.js &
node inventory-sync-service/server.js &
curl http://localhost:4200/stock/SKU-1001                                        # initial value
curl -X POST http://localhost:4000/warehouse/admin/adjust \
  -H "Content-Type: application/json" -d '{"sku":"SKU-1001","delta":-5}'         # simulate real change
curl http://localhost:4200/stock/SKU-1001                                        # reflects push, no wait
```

 File map -> assignment

| Deliverable | Where |
|---|---|
| Assignment 1: mini-prototype | `solo-recon/webhook-verifier.js`, `solo-recon/test-signatures.js` |
| Assignment 1: Learning & Blocker Journal | `docs/01-Learning-and-Blocker-Journal.md` |
| Day 3: original spec (poll-based) | `inventory-sync-service/deprecated/pollWorker.js` (now deprecated) |
| Day 4: pivot notice | `docs/Day4-Pivot-Notice.md` |
| Assignment 2: refactored deliverable | `inventory-sync-service/server.js`, `webhookReceiver.js`, `cache.js` |
| Assignment 2: Scope Delta Analysis | `docs/02-Scope-Delta-Analysis.md` |
| Assignment 3: Adaptability Index | `docs/03-Adaptability-Index-Template.md` *(template — see note inside)* |
| Supporting: mock client backend | `mock-warehouse-api/server.js` |

## What's genuinely verified, not just claimed
- Day 1-2 prototype tested against valid, tampered, and missing signatures
  (`test-signatures.js`).
- Full pivoted flow run end-to-end: warehouse-side stock change pushed via
  signed webhook, landed in the cache, and was visible on `GET /stock/:sku`
  with no polling delay.
- `GET /stock/:sku` response shape confirmed identical before and after the
  pivot (see Scope Delta Analysis, "Regression check").
