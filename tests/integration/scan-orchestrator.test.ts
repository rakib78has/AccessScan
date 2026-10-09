import { afterEach, describe, expect, it, vi } from 'vitest';
import { startScan, type ScanDeps, type TabEvent } from '../../src/background/scan-orchestrator';
import { STALE_RUNNING_MS, createScanStore } from '../../src/storage/scan-store';
import { asStorageArea, createFakeStorageArea } from '../helpers/fake-storage';
import { makeFinding, makeScanResult } from '../helpers/scan-data';

const TAB = 9;
const NOW = 1_000_000;

function setup(overrides: Partial<ScanDeps> = {}) {
  const area = createFakeStorageArea();
  const store = createScanStore(asStorageArea(area));
  let onTabEvent: ((event: TabEvent) => void) | undefined;
  const log = vi.fn();
  const injectAndScan = vi.fn<ScanDeps['injectAndScan']>(() => Promise.resolve(makeScanResult()));

  const deps: ScanDeps = {
    getTabUrl: () => Promise.resolve('https://example.com/page'),
    isFileAccessAllowed: () => Promise.resolve(false),
    injectAndScan,
    watchTab: (_tabId, callback) => {
      onTabEvent = callback;
      return () => {
        onTabEvent = undefined;
      };
    },
    store,
    now: () => NOW,
    timeoutMs: 25_000,
    log,
    ...overrides,
  };

  return {
    deps,
    store,
    area,
    log,
    injectAndScan,
    emit: (event: TabEvent) => onTabEvent?.(event),
    isWatching: () => onTabEvent !== undefined,
  };
}

/** A promise the test settles by hand, standing in for a scan still in progress. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('SC-INT-001 a successful scan', () => {
  it('is marked running, then stores the result and stops watching the tab', async () => {
    const pending = deferred<unknown>();
    const t = setup({ injectAndScan: () => pending.promise });

    const { reply, completion } = await startScan(TAB, t.deps);
    expect(reply).toEqual({ accepted: true });
    expect(await t.store.get(TAB)).toEqual({ status: 'running', startedAt: NOW });
    expect(t.isWatching()).toBe(true);

    const result = makeScanResult();
    pending.resolve(result);
    await completion;

    expect(await t.store.get(TAB)).toEqual({ status: 'done', result });
    expect(t.isWatching()).toBe(false);
  });
});

describe('SC-INT-002 pages that cannot be scanned', () => {
  it('refuses a restricted page without injecting or storing anything', async () => {
    const t = setup({ getTabUrl: () => Promise.resolve('chrome://settings') });
    const { reply } = await startScan(TAB, t.deps);
    expect(reply).toEqual({ accepted: false, error: 'restricted-page' });
    expect(t.injectAndScan).not.toHaveBeenCalled();
    expect(t.area.data.size).toBe(0);
  });

  it('explains how to enable local file scanning', async () => {
    const t = setup({ getTabUrl: () => Promise.resolve('file:///C:/site/index.html') });
    expect((await startScan(TAB, t.deps)).reply).toEqual({
      accepted: false,
      error: 'file-access-disabled',
    });
  });

  it('scans a local file once file access is allowed', async () => {
    const t = setup({
      getTabUrl: () => Promise.resolve('file:///C:/site/index.html'),
      isFileAccessAllowed: () => Promise.resolve(true),
    });
    expect((await startScan(TAB, t.deps)).reply).toEqual({ accepted: true });
  });

  it('reports a tab that no longer exists as inaccessible', async () => {
    const t = setup({ getTabUrl: () => Promise.reject(new Error('No tab with id: 9.')) });
    expect((await startScan(TAB, t.deps)).reply).toEqual({ accepted: false, error: 'no-access' });
  });

  it('when Chrome hides the URL, lets the injection error explain why', async () => {
    const t = setup({
      getTabUrl: () => Promise.resolve(undefined),
      injectAndScan: () => Promise.reject(new Error('Cannot access a chrome:// URL')),
    });
    const { reply, completion } = await startScan(TAB, t.deps);
    expect(reply).toEqual({ accepted: true });
    await completion;
    expect(await t.store.get(TAB)).toEqual({ status: 'error', error: 'restricted-page', at: NOW });
  });

  it('records a missing activeTab grant as no access', async () => {
    const t = setup({
      injectAndScan: () => Promise.reject(new Error('Missing host permission for the tab')),
    });
    await (
      await startScan(TAB, t.deps)
    ).completion;
    expect(await t.store.get(TAB)).toMatchObject({ status: 'error', error: 'no-access' });
  });
});

describe('SC-INT-003 interrupted scans', () => {
  it('times out a scan that never finishes', async () => {
    vi.useFakeTimers();
    const t = setup({ injectAndScan: () => new Promise(() => undefined) });

    const { completion } = await startScan(TAB, t.deps);
    await vi.advanceTimersByTimeAsync(25_000);
    await completion;

    expect(await t.store.get(TAB)).toMatchObject({ status: 'error', error: 'timeout' });
    expect(t.isWatching()).toBe(false);
  });

  it('clears its timer when the scan finishes first', async () => {
    vi.useFakeTimers();
    const t = setup();
    await (
      await startScan(TAB, t.deps)
    ).completion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('abandons the scan when the tab navigates, ignoring a late result', async () => {
    const pending = deferred<unknown>();
    const t = setup({ injectAndScan: () => pending.promise });

    const { completion } = await startScan(TAB, t.deps);
    t.emit('navigated');
    await completion;
    pending.resolve(makeScanResult());
    await Promise.resolve();

    expect(await t.store.get(TAB)).toMatchObject({ status: 'error', error: 'navigated' });
  });

  it('stores nothing for a tab closed mid-scan', async () => {
    const pending = deferred<unknown>();
    const t = setup({ injectAndScan: () => pending.promise });

    const { completion } = await startScan(TAB, t.deps);
    t.emit('closed');
    await completion;

    expect(t.area.data.size).toBe(0);
  });

  it('maps a frame removed during injection to a navigation', async () => {
    const t = setup({
      injectAndScan: () => Promise.reject(new Error('Frame with ID 0 was removed.')),
    });
    await (
      await startScan(TAB, t.deps)
    ).completion;
    expect(await t.store.get(TAB)).toMatchObject({ error: 'navigated' });
  });
});

describe('SC-INT-004 untrusted scanner output', () => {
  it.each([
    ['nothing', undefined],
    ['a string', '<script>alert(1)</script>'],
    [
      'a result with a javascript: help URL',
      makeScanResult({ findings: [makeFinding({ helpUrl: 'javascript:alert(1)' })] }),
    ],
    ['a result from another schema version', { ...makeScanResult(), schemaVersion: 99 }],
  ])('rejects %s as an invalid result', async (_label, output) => {
    const t = setup({ injectAndScan: () => Promise.resolve(output) });
    await (
      await startScan(TAB, t.deps)
    ).completion;
    expect(await t.store.get(TAB)).toMatchObject({ status: 'error', error: 'invalid-result' });
  });

  it('logs the error code only, never page content', async () => {
    const t = setup({ injectAndScan: () => Promise.resolve({ secret: 'page text' }) });
    await (
      await startScan(TAB, t.deps)
    ).completion;
    expect(t.log).toHaveBeenCalledWith('scan failed', { code: 'invalid-result' });
    expect(JSON.stringify(t.log.mock.calls)).not.toContain('page text');
  });
});

describe('SC-INT-005 concurrent and orphaned scans', () => {
  it('refuses a second scan of a tab while one is running', async () => {
    const t = setup();
    t.injectAndScan.mockReturnValue(deferred<unknown>().promise);

    await startScan(TAB, t.deps);
    expect((await startScan(TAB, t.deps)).reply).toEqual({ accepted: false, error: 'busy' });
    expect(t.injectAndScan).toHaveBeenCalledTimes(1);
  });

  it('allows a new scan when the running state was orphaned by a stopped worker', async () => {
    const t = setup();
    await t.store.set(TAB, { status: 'running', startedAt: NOW - STALE_RUNNING_MS - 1 });
    expect((await startScan(TAB, t.deps)).reply).toEqual({ accepted: true });
  });

  it('replaces an earlier result when the page is scanned again', async () => {
    const t = setup();
    await (
      await startScan(TAB, t.deps)
    ).completion;
    const second = makeScanResult({ passedRuleCount: 1 });
    t.injectAndScan.mockResolvedValueOnce(second);
    await (
      await startScan(TAB, t.deps)
    ).completion;
    expect(await t.store.get(TAB)).toEqual({ status: 'done', result: second });
  });

  it('keeps scans of different tabs apart', async () => {
    const t = setup();
    await Promise.all([
      (await startScan(1, t.deps)).completion,
      (await startScan(2, t.deps)).completion,
    ]);
    expect([...t.area.data.keys()].sort()).toEqual(['scan:1', 'scan:2']);
  });
});

describe('SC-INT-006 storage failure', () => {
  it('logs instead of leaving an unhandled rejection', async () => {
    const pending = deferred<unknown>();
    const t = setup({ injectAndScan: () => pending.promise });
    const { completion } = await startScan(TAB, t.deps);
    t.deps.store.set = () => Promise.reject(new Error('QUOTA_BYTES quota exceeded'));
    pending.resolve(makeScanResult());
    await expect(completion).resolves.toBeUndefined();
    expect(t.log).toHaveBeenCalledWith('scan outcome could not be stored', expect.any(Object));
  });
});
