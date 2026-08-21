/**
 * DEPRECATED — see DEPRECATED.md in this folder.
 *
 * inventory-sync-service/deprecated/pollWorker.js
 * ORIGINAL Day 3 spec: poll the warehouse API every 5 minutes and refresh
 * the cache. Killed by the Day 4 client pivot — the warehouse is turning
 * off the polling endpoint's guarantees in favor of push. Left in place
 * (not deleted) only so the "before" state is auditable, per the
 * non-negotiable rule that obsolete code must be visibly marked, not run
 * in parallel. This file is NOT imported by server.js anymore.
 */
const cache = require('../cache');

const WAREHOUSE_URL = 'http://localhost:4000/warehouse/stock';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes, per original spec

async function pollOnce() {
  const res = await fetch(WAREHOUSE_URL);
  if (!res.ok) throw new Error(`warehouse poll failed: ${res.status}`);
  const { stock } = await res.json();
  cache.setBulk(stock);
  console.log('[poll-worker][DEPRECATED] cache refreshed via poll:', stock);
}

function start() {
  console.warn('[poll-worker] WARNING: starting a DEPRECATED code path.');
  pollOnce().catch((err) => console.error('[poll-worker] initial poll failed:', err.message));
  return setInterval(() => {
    pollOnce().catch((err) => console.error('[poll-worker] poll failed:', err.message));
  }, POLL_INTERVAL_MS);
}

module.exports = { start, pollOnce };
