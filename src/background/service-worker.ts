/**
 * MV3 background service worker.
 *
 * Chrome stops this worker whenever it is idle, so it must never be the only
 * holder of state that matters; scan results will live in
 * chrome.storage.session from Milestone 2, when this worker starts
 * orchestrating scans.
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.info('[SiteCheck] installed', { reason });
});
