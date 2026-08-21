/**
 * inventory-sync-service/cache.js
 *
 * Deliberately kept unchanged across the pivot — this is what "architectural
 * integrity" during a refactor looks like. The query endpoint (server.js)
 * doesn't care whether the cache was filled by a poll loop or a webhook;
 * it just reads from here.
 */
const store = new Map();
let lastUpdated = null;

function set(sku, quantity) {
  store.set(sku, quantity);
  lastUpdated = new Date().toISOString();
}

function setBulk(stockObject) {
  for (const [sku, quantity] of Object.entries(stockObject)) {
    store.set(sku, quantity);
  }
  lastUpdated = new Date().toISOString();
}

function get(sku) {
  return store.has(sku) ? store.get(sku) : null;
}

function getAll() {
  return { stock: Object.fromEntries(store), lastUpdated };
}

module.exports = { set, setBulk, get, getAll };
