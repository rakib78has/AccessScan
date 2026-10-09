import { describe, expect, it } from 'vitest';
import {
  STALE_RUNNING_MS,
  createScanStore,
  isStale,
  parseScanState,
  scanKey,
} from '../../src/storage/scan-store';
import { asStorageArea, createFakeStorageArea } from '../helpers/fake-storage';
import { makeScanResult } from '../helpers/scan-data';

describe('SC-UNIT-007 scan store', () => {
  it('round-trips each state through storage', async () => {
    const area = createFakeStorageArea();
    const store = createScanStore(asStorageArea(area));
    const states = [
      { status: 'running', startedAt: 1 },
      { status: 'done', result: makeScanResult() },
      { status: 'error', error: 'timeout', at: 2 },
    ] as const;

    for (const state of states) {
      await store.set(3, state);
      expect(await store.get(3)).toEqual(state);
    }
    expect([...area.data.keys()]).toEqual(['scan:3']);
  });

  it('returns null for a tab with nothing stored, and after removal', async () => {
    const store = createScanStore(asStorageArea(createFakeStorageArea()));
    expect(await store.get(1)).toBeNull();
    await store.set(1, { status: 'running', startedAt: 1 });
    await store.remove(1);
    expect(await store.get(1)).toBeNull();
  });

  it('keys by tab id', () => {
    expect(scanKey(42)).toBe('scan:42');
  });
});

describe('SC-UNIT-007 parseScanState', () => {
  it.each([
    null,
    'done',
    { status: 'unknown' },
    { status: 'running' },
    { status: 'done', result: { schemaVersion: 0 } },
    { status: 'error', error: 'made-up', at: 1 },
    { status: 'error', error: 'timeout' },
  ])('treats %j as nothing stored', (value) => {
    expect(parseScanState(value)).toBeNull();
  });
});

describe('SC-UNIT-007 isStale', () => {
  it('flags only running states older than the threshold', () => {
    const running = { status: 'running', startedAt: 1000 } as const;
    expect(isStale(running, 1000 + STALE_RUNNING_MS)).toBe(false);
    expect(isStale(running, 1001 + STALE_RUNNING_MS)).toBe(true);
    expect(isStale({ status: 'error', error: 'timeout', at: 0 }, Number.MAX_SAFE_INTEGER)).toBe(
      false,
    );
  });
});
