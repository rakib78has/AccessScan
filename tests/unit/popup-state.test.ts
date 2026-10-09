import { describe, expect, it } from 'vitest';
import { toPopupState } from '../../src/popup/hooks/useScan';
import { STALE_RUNNING_MS } from '../../src/storage/scan-store';
import { makeScanResult } from '../helpers/scan-data';

const tab = { id: 5, url: 'https://example.com/page?session=abc' };
const now = 1_000_000;

describe('SC-UNIT-008 toPopupState', () => {
  it('is idle when nothing is stored', () => {
    expect(toPopupState(tab, null, now)).toEqual({ phase: 'idle', tabId: 5 });
  });

  it('shows a running scan, but not one orphaned by a stopped worker', () => {
    expect(toPopupState(tab, { status: 'running', startedAt: now - 1000 }, now).phase).toBe(
      'running',
    );
    const orphaned = { status: 'running', startedAt: now - STALE_RUNNING_MS - 1 } as const;
    expect(toPopupState(tab, orphaned, now).phase).toBe('idle');
  });

  it('shows a result for the page the tab is still on, ignoring the query string', () => {
    const state = { status: 'done', result: makeScanResult() } as const;
    expect(toPopupState(tab, state, now).phase).toBe('done');
  });

  it('hides a result from a page the tab has since left', () => {
    const state = { status: 'done', result: makeScanResult() } as const;
    expect(toPopupState({ id: 5, url: 'https://example.com/other' }, state, now).phase).toBe(
      'idle',
    );
  });

  it('shows a stored error', () => {
    expect(toPopupState(tab, { status: 'error', error: 'navigated', at: now }, now)).toEqual({
      phase: 'error',
      tabId: 5,
      error: 'navigated',
    });
  });
});
