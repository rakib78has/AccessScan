import { isScanResult } from '../messaging/guards';
import { SCAN_ERROR_CODES, type ScanErrorCode } from '../shared/errors';
import type { ScanResult } from '../shared/types/scan';

/**
 * The latest scan per tab, kept in chrome.storage.session: it survives the
 * service worker and popup being torn down but not a browser restart, and
 * neither page scripts nor content scripts can read it.
 */

export type ScanState =
  | { status: 'running'; startedAt: number }
  | { status: 'done'; result: ScanResult }
  | { status: 'error'; error: ScanErrorCode; at: number };

/** The scan timeout plus a margin. An older "running" state was orphaned by a stopped worker. */
export const STALE_RUNNING_MS = 40_000;

export function isStale(state: ScanState, now: number): boolean {
  return state.status === 'running' && now - state.startedAt > STALE_RUNNING_MS;
}

export function scanKey(tabId: number): string {
  return `scan:${String(tabId)}`;
}

/** Stored data may come from an older extension version, so it is checked like any other input. */
export function parseScanState(value: unknown): ScanState | null {
  if (typeof value !== 'object' || value === null) return null;
  const state = value as Record<string, unknown>;
  switch (state.status) {
    case 'running':
      return typeof state.startedAt === 'number'
        ? { status: 'running', startedAt: state.startedAt }
        : null;
    case 'done':
      return isScanResult(state.result) ? { status: 'done', result: state.result } : null;
    case 'error':
      return SCAN_ERROR_CODES.includes(state.error as ScanErrorCode) && typeof state.at === 'number'
        ? { status: 'error', error: state.error as ScanErrorCode, at: state.at }
        : null;
    default:
      return null;
  }
}

export interface ScanStore {
  get(tabId: number): Promise<ScanState | null>;
  set(tabId: number, state: ScanState): Promise<void>;
  remove(tabId: number): Promise<void>;
}

export function createScanStore(area: chrome.storage.StorageArea): ScanStore {
  return {
    async get(tabId) {
      const key = scanKey(tabId);
      const items = await area.get(key);
      return parseScanState(items[key]);
    },
    async set(tabId, state) {
      await area.set({ [scanKey(tabId)]: state });
    },
    async remove(tabId) {
      await area.remove(scanKey(tabId));
    },
  };
}
