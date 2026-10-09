import type { ScanErrorCode } from '../shared/errors';

/** Popup → service worker: scan this tab. */
export interface ScanStartMessage {
  type: 'scan:start';
  tabId: number;
}

export type WorkerMessage = ScanStartMessage;

/**
 * Service worker → popup, sent as the reply to `scan:start`. Acceptance only
 * means the scan began; its outcome arrives through chrome.storage.session.
 * A rejected request (busy, restricted page) is not stored.
 */
export type ScanStartReply = { accepted: true } | { accepted: false; error: ScanErrorCode };
