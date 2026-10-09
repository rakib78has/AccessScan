import { describe, expect, it, vi } from 'vitest';
import { handleMessage, isTrustedSender } from '../../src/background/message-handler';
import type { ScanDeps } from '../../src/background/scan-orchestrator';
import { createScanStore } from '../../src/storage/scan-store';
import { asStorageArea, createFakeStorageArea } from '../helpers/fake-storage';
import { makeScanResult } from '../helpers/scan-data';

const EXTENSION_ID = 'abcdefghijklmnopabcdefghijklmnop';
const ORIGIN = `chrome-extension://${EXTENSION_ID}/`;
const POPUP = { id: EXTENSION_ID, url: `${ORIGIN}popup/index.html` };
const SCAN = { type: 'scan:start', tabId: 4 };

function makeDeps() {
  const injectAndScan = vi.fn(() => Promise.resolve<unknown>(makeScanResult()));
  const deps: ScanDeps = {
    getTabUrl: () => Promise.resolve('https://example.com/'),
    isFileAccessAllowed: () => Promise.resolve(false),
    injectAndScan,
    watchTab: () => () => undefined,
    store: createScanStore(asStorageArea(createFakeStorageArea())),
    now: () => 0,
    timeoutMs: 1000,
    log: vi.fn(),
  };
  return { ...deps, injectAndScan };
}

describe('SC-INT-007 message handling', () => {
  it('starts a scan for SiteCheck’s own popup', async () => {
    const deps = makeDeps();
    expect(await handleMessage(SCAN, POPUP, ORIGIN, deps)).toEqual({ accepted: true });
  });

  it.each([
    [
      'another extension',
      {
        id: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
        url: 'chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/x.html',
      },
    ],
    [
      'a content script inside a web page',
      { id: EXTENSION_ID, url: 'https://evil.example/', tab: { id: 1 } },
    ],
    ['a sender with no URL', { id: EXTENSION_ID }],
    ['a sender with no id', { url: `${ORIGIN}popup/index.html` }],
  ])('ignores messages from %s', async (_label, sender) => {
    const deps = makeDeps();
    expect(
      await handleMessage(SCAN, sender as chrome.runtime.MessageSender, ORIGIN, deps),
    ).toBeNull();
    expect(deps.injectAndScan).not.toHaveBeenCalled();
  });

  it.each([{ type: 'scan:start', tabId: '4' }, { type: 'other' }, null, 'scan:start'])(
    'ignores the malformed message %j',
    async (message) => {
      expect(await handleMessage(message, POPUP, ORIGIN, makeDeps())).toBeNull();
    },
  );

  it('replies with a failure rather than throwing when the scan cannot start', async () => {
    const deps = makeDeps();
    deps.store.get = () => Promise.reject(new Error('storage unavailable'));
    expect(await handleMessage(SCAN, POPUP, ORIGIN, deps)).toEqual({
      accepted: false,
      error: 'scan-failed',
    });
  });

  it('isTrustedSender requires both the extension id and an extension-page URL', () => {
    expect(isTrustedSender(POPUP, ORIGIN)).toBe(true);
    expect(isTrustedSender({ ...POPUP, url: 'https://example.com/' }, ORIGIN)).toBe(false);
  });
});
