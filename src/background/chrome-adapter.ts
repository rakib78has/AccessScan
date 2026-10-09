import '../scanner/global';
import { createScanStore } from '../storage/scan-store';
import { SCAN_TIMEOUT_MS, type ScanDeps } from './scan-orchestrator';

/** Binds the scan orchestrator to the real Chrome APIs. */

const SCANNER_FILE = 'scanner.js';

type ScanCall = { ok: true; result: unknown } | { ok: false; message: string };

async function injectAndScan(tabId: number): Promise<unknown> {
  // Top frame only: activeTab does not cover cross-origin iframes. axe lists
  // frames it could not reach under "frame-tested", as needing review.
  await chrome.scripting.executeScript({ target: { tabId }, files: [SCANNER_FILE] });

  // This function is serialized into the page, so it cannot use anything from this module.
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (): Promise<ScanCall> => {
      try {
        const scan = globalThis.__siteCheckScan;
        if (!scan) return { ok: false, message: 'scanner did not load' };
        return { ok: true, result: await scan() };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    },
  });

  const call = injection?.result;
  if (!call) throw new Error('scanner returned nothing');
  if (!call.ok) throw new Error(call.message);
  return call.result;
}

function watchTab(tabId: number, onEvent: (event: 'navigated' | 'closed') => void): () => void {
  // `status` is reported without the `tabs` permission; `url` is not.
  const onUpdated = (id: number, change: chrome.tabs.OnUpdatedInfo) => {
    if (id === tabId && change.status === 'loading') onEvent('navigated');
  };
  const onRemoved = (id: number) => {
    if (id === tabId) onEvent('closed');
  };
  chrome.tabs.onUpdated.addListener(onUpdated);
  chrome.tabs.onRemoved.addListener(onRemoved);
  return () => {
    chrome.tabs.onUpdated.removeListener(onUpdated);
    chrome.tabs.onRemoved.removeListener(onRemoved);
  };
}

export const scanStore = createScanStore(chrome.storage.session);

export const chromeScanDeps: ScanDeps = {
  getTabUrl: async (tabId) => (await chrome.tabs.get(tabId)).url,
  isFileAccessAllowed: () => chrome.extension.isAllowedFileSchemeAccess(),
  injectAndScan,
  watchTab,
  store: scanStore,
  now: () => Date.now(),
  timeoutMs: SCAN_TIMEOUT_MS,
  // Codes and counts only: never page content or URLs.
  log: (message, details) => {
    console.warn(`[SiteCheck] ${message}`, details);
  },
};
