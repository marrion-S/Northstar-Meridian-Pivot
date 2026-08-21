# Assignment 1 — Learning & Blocker Journal

**Tool assigned:** Webhook signature verification (HMAC-SHA256)
**Time-box:** 6 hours over Days 1–2
**Actual time spent:** ~4.5 hours
**Prototype:** `solo-recon/webhook-verifier.js` + `solo-recon/test-signatures.js`

## Why this tool, going in
I'd used webhooks as a *consumer* before (pointing a URL at a service and
trusting whatever showed up), but never had to prove a payload wasn't
spoofed. That's the actual skill here — anyone can accept a POST request;
verifying it's authentic is the unfamiliar part.

## Log

**Hour 0–1 — Orientation**
Read up on the general shape of the problem: sender and receiver share a
secret, the sender hashes the payload with it, sends the hash alongside the
payload, and the receiver recomputes the hash locally and compares. Built a
throwaway script that just did `crypto.createHmac('sha256', secret)` on a
JSON string to make sure I understood the primitive before wiring up HTTP.

**Hour 1–2.5 — Blocker: signatures never matched**
Wired the throwaway script into an Express route. Signatures computed by my
"sender" script and my "receiver" route never matched, even with the
identical secret and payload object.

- *Dead end tried:* assumed I had a typo in the secret, spent 20 minutes
  diffing strings.
- *Actual cause:* `express.json()` parses the body into a JS object, then
  when I re-stringified it to hash, key order / whitespace differed from
  the original bytes the sender actually sent. Hashing a re-serialized copy
  of the payload is not the same as hashing what arrived on the wire.
- *Fix:* switched the route to `express.raw({ type: 'application/json' })`
  so I hash the exact raw bytes, and only `JSON.parse` *after* the signature
  passes. This is the single most important thing I'd tell someone else
  starting this cold.

**Hour 2.5–3.5 — Blocker: comparison itself was insecure**
Once signatures matched, I compared them with plain `===`. Read enough about
timing attacks to be uncomfortable with that for anything meant to gate
access — a `===` string comparison can leak information about how many
leading characters were correct via response-time differences.

- *Fix:* switched to `crypto.timingSafeEqual` on two equal-length buffers,
  with an explicit length check first (it throws if lengths differ, so
  that has to be handled before calling it, not caught after).

**Hour 3.5–4.5 — Proving it actually rejects things**
Didn't trust that it worked just because valid requests were accepted —
wrote `test-signatures.js` to send (1) a validly signed request, (2) a
tampered payload with a stale signature, (3) a request with no signature
header at all. Confirmed 200 / 401 / 401 respectively before calling this
done.

## Resources consulted
Node's built-in `crypto` module documentation (for `createHmac` and
`timingSafeEqual` specifically), and general background reading on
webhook-signing conventions used by common SaaS providers, to confirm the
raw-body-hashing approach wasn't something I'd invented incorrectly — it's
the standard pattern.

## Resolved without supervision
Both blockers above were self-diagnosed by isolating variables (first
hashing in isolation, then adding HTTP, then re-reading what each Express
body parser actually hands you) rather than pattern-matching to a
remembered solution. No teammate or instructor input was used.

## What I'd flag for Day 3+
This exact verification logic is what Day 4's pivot ends up needing
verbatim — worth keeping this file's function signature stable in case it
gets reused rather than rebuilt under pressure.
