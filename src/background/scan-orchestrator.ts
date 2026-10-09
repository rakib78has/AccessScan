import type { ScanStartReply } from '../messaging/contracts';
import { isScanResult } from '../messaging/guards';
import { classifyInjectionError, type ScanErrorCode } from '../shared/errors';
import { checkScannableUrl } from '../shared/url';
import { isStale, type ScanStore } from '../storage/scan-store';

/**
 * Runs one scan of one tab. Chrome APIs arrive through `ScanDeps`, so every
 * failure path can be exercised in tests without a browser.
 */

export type TabEvent = 'navigated' | 'closed';

export interface ScanDeps {
  /** Resolves undefined when Chrome hides the URL (no access); rejects if the tab is gone. */
  getTabUrl(tabId: number): Promise<string | undefined>;
  isFileAccessAllowed(): Promise<boolean>;
  /** Injects the scanner and returns whatever it produced, unvalidated. */
  injectAndScan(tabId: number): Promise<unknown>;
  /** Reports navigation or closure of the tab until the returned function is called. */
  watchTab(tabId: number, onEvent: (event: TabEvent) => void): () => void;
  store: ScanStore;
  now(): number;
  timeoutMs: number;
  log(message: string, details: Record<string, unknown>): void;
}

/**
 * Chrome may stop an idle service worker after about 30 seconds, so the
 * timeout stays below that.
 */
export const SCAN_TIMEOUT_MS = 25_000;

/**
 * Validates the request and starts the scan. Resolves as soon as the scan has
 * started; its outcome is written to the store, which the popup watches.
 * The returned promise `completion` exists for tests and settles when the
 * outcome has been recorded.
 */
export async function startScan(
  tabId: number,
  deps: ScanDeps,
): Promise<{ reply: ScanStartReply; completion: Promise<void> }> {
  const rejected = (error: ScanErrorCode) => ({
    reply: { accepted: false, error } as const,
    completion: Promise.resolve(),
  });

  const existing = await deps.store.get(tabId);
  if (existing?.status === 'running' && !isStale(existing, deps.now())) return rejected('busy');

  let url: string | undefined;
  try {
    url = await deps.getTabUrl(tabId);
  } catch {
    return rejected('no-access');
  }

  // Without access Chrome hides the URL, so only a visible URL can be
  // pre-checked; otherwise the injection error explains why the page is off limits.
  if (url !== undefined) {
    const check = checkScannableUrl(url, await deps.isFileAccessAllowed());
    if (!check.scannable) return rejected(check.reason);
  }

  await deps.store.set(tabId, { status: 'running', startedAt: deps.now() });
  return { reply: { accepted: true }, completion: runScan(tabId, deps) };
}

type Outcome =
  { kind: 'result'; value: unknown } | { kind: 'error'; code: ScanErrorCode } | { kind: 'closed' };

async function runScan(tabId: number, deps: ScanDeps): Promise<void> {
  let interrupt: (outcome: Outcome) => void = () => undefined;
  const interrupted = new Promise<Outcome>((resolve) => {
    interrupt = resolve;
  });

  const timer = setTimeout(() => {
    interrupt({ kind: 'error', code: 'timeout' });
  }, deps.timeoutMs);
  const unwatch = deps.watchTab(tabId, (event) => {
    interrupt(event === 'closed' ? { kind: 'closed' } : { kind: 'error', code: 'navigated' });
  });

  const scanned = deps.injectAndScan(tabId).then(
    (value): Outcome => ({ kind: 'result', value }),
    (error: unknown): Outcome => ({ kind: 'error', code: classifyInjectionError(error) }),
  );

  try {
    await record(tabId, await Promise.race([scanned, interrupted]), deps);
  } catch (error) {
    // Only a storage failure can land here, so nothing more can be recorded.
    deps.log('scan outcome could not be stored', { error: String(error) });
  } finally {
    clearTimeout(timer);
    unwatch();
  }
}

async function record(tabId: number, outcome: Outcome, deps: ScanDeps): Promise<void> {
  if (outcome.kind === 'closed') {
    await deps.store.remove(tabId);
    return;
  }
  if (outcome.kind === 'result' && isScanResult(outcome.value)) {
    await deps.store.set(tabId, { status: 'done', result: outcome.value });
    return;
  }
  const code = outcome.kind === 'error' ? outcome.code : 'invalid-result';
  deps.log('scan failed', { code });
  await deps.store.set(tabId, { status: 'error', error: code, at: deps.now() });
}
