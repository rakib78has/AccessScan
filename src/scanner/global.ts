import type { ScanResult } from '../shared/types/scan';

/**
 * The scanner bundle registers this function in the extension's isolated
 * world (the page's own scripts cannot see it). The service worker then calls
 * it with a second executeScript, whose returned promise Chrome awaits.
 */
declare global {
  var __siteCheckScan: (() => Promise<ScanResult>) | undefined;
}

export {};
