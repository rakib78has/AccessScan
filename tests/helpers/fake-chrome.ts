import { vi } from 'vitest';
import type { ScanStartReply } from '../../src/messaging/contracts';
import { createFakeStorageArea } from './fake-storage';

interface Options {
  /** The active tab, or null for none. */
  tab?: { id: number; url?: string } | null;
  /** What the service worker replies to scan:start; a function can reject. */
  reply?: ScanStartReply | (() => Promise<ScanStartReply | undefined>);
}

/**
 * Installs the slice of the `chrome` global the popup uses. Remove it with
 * vi.unstubAllGlobals() after each test.
 */
export function installFakeChrome({
  tab = { id: 5, url: 'https://example.com/page' },
  reply = { accepted: true },
}: Options = {}) {
  const session = createFakeStorageArea();
  const sendMessage = vi.fn(typeof reply === 'function' ? reply : () => Promise.resolve(reply));

  vi.stubGlobal('chrome', {
    tabs: { query: vi.fn(() => Promise.resolve(tab ? [tab] : [])) },
    runtime: { sendMessage },
    storage: { session },
  });

  return { session, sendMessage };
}
