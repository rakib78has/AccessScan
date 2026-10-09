/**
 * MV3 background service worker: starts scans when the popup asks.
 *
 * Chrome stops this worker whenever it is idle, so it holds no state of its
 * own; scan state lives in chrome.storage.session. Listeners are registered
 * synchronously at the top level so Chrome can wake the worker for them.
 */

import { chromeScanDeps, scanStore } from './chrome-adapter';
import { handleMessage } from './message-handler';

const EXTENSION_ORIGIN = chrome.runtime.getURL('');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void handleMessage(message, sender, EXTENSION_ORIGIN, chromeScanDeps).then((reply) => {
    if (reply) sendResponse(reply);
  });
  return true; // keeps the channel open for the asynchronous reply
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void scanStore.remove(tabId);
});
