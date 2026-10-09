/** Every way a scan can fail that the user needs to hear about. */
export const SCAN_ERROR_CODES = [
  'restricted-page',
  'file-access-disabled',
  'no-access',
  'navigated',
  'timeout',
  'busy',
  'invalid-result',
  'scan-failed',
] as const;

export type ScanErrorCode = (typeof SCAN_ERROR_CODES)[number];

const MESSAGES: Record<ScanErrorCode, string> = {
  'restricted-page':
    'Chrome does not let extensions scan this kind of page, such as browser settings, other extensions or the Chrome Web Store.',
  'file-access-disabled':
    'To scan local files, turn on "Allow access to file URLs" for SiteCheck in chrome://extensions.',
  'no-access':
    'SiteCheck cannot access this page. Click the SiteCheck icon on this tab again, then scan.',
  navigated: 'The page changed while it was being scanned. Scan again once it has loaded.',
  timeout: 'The scan took too long and was stopped. Very large pages may not be scannable.',
  busy: 'A scan of this tab is already running.',
  'invalid-result': 'The scan returned data SiteCheck could not read. Please try again.',
  'scan-failed': 'The scan failed unexpectedly. Reload the page and try again.',
};

export function scanErrorMessage(code: ScanErrorCode): string {
  return MESSAGES[code];
}

/*
 * Chrome reports injection failures only as message strings, so they are
 * classified by pattern. Order matters: "Cannot access a chrome:// URL" is a
 * restricted page, while other "Cannot access" errors mean the activeTab
 * grant is missing.
 */
const RESTRICTED_PATTERNS = [
  /cannot access a (chrome|edge|about|devtools|chrome-extension|chrome-untrusted):/i,
  /cannot be scripted/i,
  /cannot access contents of url "(chrome|edge|about|devtools|chrome-extension|view-source|data|blob):/i,
];
const NO_ACCESS_PATTERNS = [
  /cannot access/i,
  /missing host permission/i,
  /must request permission/i,
];
const NAVIGATION_PATTERNS = [
  /frame with id \d+ was removed/i,
  /no frame with id/i,
  /page was unloaded/i,
  /document .* is not available/i,
];

export function classifyInjectionError(error: unknown): ScanErrorCode {
  const message = error instanceof Error ? error.message : String(error);
  const matches = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(message));
  if (matches(RESTRICTED_PATTERNS)) return 'restricted-page';
  if (matches(NO_ACCESS_PATTERNS)) return 'no-access';
  if (matches(NAVIGATION_PATTERNS)) return 'navigated';
  return 'scan-failed';
}
