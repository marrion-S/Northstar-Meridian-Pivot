# Day 4 — Client Pivot Notice

**From:** Northstar Retail Co.
**Re:** Inventory sync integration — change of method

Effective in **48 hours**, we're deprecating guaranteed support for polling
reads against `/warehouse/stock`. Our infra team can no longer promise that
endpoint reflects real-time state — too many downstream consumers hammering
it on independent schedules was itself becoming a reliability problem.

Going forward, integrations must subscribe to `stock.updated` push events.
We are not moving the deadline, and we are not willing to keep the original
poll-based scope alongside this — pick one, and it has to be the push model.

Same deadline. No extension. No negotiating back to the original spec.

— Northstar Retail Co.
