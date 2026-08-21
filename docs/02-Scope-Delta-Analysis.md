 Scope Delta Analysis

Sprint: Northstar Retail Co., Sprint 2
**Trigger:** Day 4 client pivot — polling method killed, 48-hour switch to webhook push
**Deadline:** unchanged

 Dropped
- `pollWorker.js` — the 5-minute `setInterval` poll loop against
  `GET /warehouse/stock`. Not deleted; moved to `deprecated/` with a
  `DEPRECATED.md` explaining why, per the non-negotiable rule that obsolete
  code must be visibly marked, not left running in parallel.
- The assumption that "freshness" meant "at most 5 minutes stale." The new
  spec makes freshness event-driven instead of interval-driven, which is a
  behavioral change, not just an implementation swap.

 Modified
- Cache write path. `cache.js` itself is untouched — both the old poll
  loop and the new webhook receiver call the same `set`/`setBulk`
  functions. What changed is *who calls them*: a timer, versus an inbound
  HTTP request.
- `server.js` boot sequence. Previously: start server, start poll
  interval. Now: start server, seed cache with one-time bootstrap read,
  register this service's webhook URL with the warehouse. Registration
  replaces the recurring poll as the thing that keeps data flowing.

 Added
- `webhookReceiver.js` — the actual pivot deliverable. Receives
  `POST /webhooks/stock-update`, verifies the HMAC-SHA256 signature using
  the exact raw-body + timing-safe-compare approach built and de-risked
  during Day 1–2 solo recon, then updates the cache.
- Registration handshake — on boot, the service tells the warehouse
  where to push events, instead of the warehouse being agnostic to who's
  reading it.
- A new failure mode to own: an unreachable or slow subscriber can now
  cause the warehouse's push to fail loudly (see `[warehouse] webhook push
  failed` in its logs) rather than just missing one poll tick silently.

 Regression check
Contract: `GET /stock/:sku` — response shape (`{ sku, quantity }`),
status codes (200 / 404), and route path are byte-identical to the Day 3
version. Verified manually: queried a SKU before and after a simulated
warehouse-side stock change and confirmed the only difference was *how fast*
the new value appeared (immediately via push, versus up to 5 minutes late
via the old poll) — not the shape of the response.
Conclusion: no breaking change for the support tool that calls this
service. The pivot is entirely internal to how the cache gets filled.

 What the pivot actually cost
- ~1.5 hours that would otherwise have gone toward hardening the original
  poll implementation (backoff on failed polls, jitter to avoid thundering
  herd) instead went into verification logic and the registration
  handshake. That original hardening work is now moot, not banked.
- Increased attack surface: this service now accepts inbound requests from
  the internet instead of only making outbound ones. Signature verification
  covers the immediate risk, but see backlog below for what's still open.

 Reprioritized backlog (deferred to hit the 48-hour deadline)
1. Replay protection — current verification confirms authenticity and
   integrity, but not freshness. A captured valid request could be
   replayed. Needs a timestamp or nonce check. *Not done because the
   deadline didn't allow it; flagged as the top follow-up item.
2. Retry / dead-letter handling on the warehouse side — right now a
   failed push (subscriber down) just logs an error and moves on. Needs a
   retry-with-backoff and a way to detect a subscriber has gone dark.
3. **Persistent cache** — still in-memory (`Map`), so a service restart
   loses state until the next event arrives. Was true before the pivot too,
   but the risk profile changes now that there's no periodic re-poll to
   self-heal from a restart.
4. Secret rotation** — the shared secret is static and hardcoded for this
   sprint. Needs to move to environment config at minimum, ideally a
   rotation mechanism.

Items 1–4 are explicitly *not* regressions from the pivot — they're honest
gaps in a 48-hour turnaround, called out rather than hidden.
