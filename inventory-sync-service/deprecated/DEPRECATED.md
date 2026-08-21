# Deprecated: polling-based sync

**Deprecated on:** Day 5, as a direct result of the Day 4 client pivot.

**Why:** Northstar killed guaranteed support for the polling endpoint's
freshness contract with 48 hours' notice. A 5-minute poll loop can no longer
be trusted to reflect current stock, so it's replaced by `webhookReceiver.js`
in the parent folder.

**What changed for consumers:** nothing. `GET /stock/:sku` still returns the
same response shape it always did — see `docs/02-Scope-Delta-Analysis.md`
for the architectural-integrity check.

**Status:** kept for audit history only. Not imported by `server.js`. Do not
re-enable — running this alongside the webhook receiver would let a stale
poll tick silently overwrite a fresher push-driven value.
