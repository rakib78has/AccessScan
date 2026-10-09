import type { ScanErrorCode } from './errors';

export type UrlCheck = { scannable: true } | { scannable: false; reason: ScanErrorCode };

/** Hosts Chrome never lets extensions script, whatever their permissions. */
const BLOCKED_HOSTS = new Set(['chromewebstore.google.com']);
const BLOCKED_PATH_PREFIXES = [{ host: 'chrome.google.com', path: '/webstore' }];

/**
 * Decides before injecting whether a page can be scanned, so the user gets a
 * specific explanation rather than Chrome's generic injection error.
 */
export function checkScannableUrl(rawUrl: string | undefined, fileAccess: boolean): UrlCheck {
  let url: URL;
  try {
    url = new URL(rawUrl ?? '');
  } catch {
    return { scannable: false, reason: 'restricted-page' };
  }

  if (url.protocol === 'file:') {
    return fileAccess ? { scannable: true } : { scannable: false, reason: 'file-access-disabled' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { scannable: false, reason: 'restricted-page' };
  }
  if (
    BLOCKED_HOSTS.has(url.hostname) ||
    BLOCKED_PATH_PREFIXES.some((b) => url.hostname === b.host && url.pathname.startsWith(b.path))
  ) {
    return { scannable: false, reason: 'restricted-page' };
  }
  return { scannable: true };
}

/** Drops the query and fragment, which can carry session tokens, before a URL is stored. */
export function redactUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'file:' ? `file://${url.pathname}` : `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}
