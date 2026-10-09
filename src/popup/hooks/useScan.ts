import { useCallback, useEffect, useState } from 'react';
import type { ScanStartReply, ScanStartMessage } from '../../messaging/contracts';
import type { ScanErrorCode } from '../../shared/errors';
import { redactUrl } from '../../shared/url';
import { isStale, parseScanState, scanKey, type ScanState } from '../../storage/scan-store';

export type PopupState =
  | { phase: 'loading' }
  | { phase: 'no-tab' }
  | { phase: 'idle'; tabId: number }
  | { phase: 'running'; tabId: number }
  | { phase: 'done'; tabId: number; state: Extract<ScanState, { status: 'done' }> }
  | { phase: 'error'; tabId: number; error: ScanErrorCode };

interface Tab {
  id: number;
  url: string | undefined;
}

/**
 * Turns stored scan state into what the popup shows. A stored result for a
 * different page (the tab has navigated since) is ignored, as is a "running"
 * state whose service worker was stopped before it could finish.
 */
export function toPopupState(tab: Tab, stored: ScanState | null, now: number): PopupState {
  if (!stored || isStale(stored, now)) return { phase: 'idle', tabId: tab.id };
  switch (stored.status) {
    case 'running':
      return { phase: 'running', tabId: tab.id };
    case 'error':
      return { phase: 'error', tabId: tab.id, error: stored.error };
    case 'done':
      if (tab.url !== undefined && redactUrl(tab.url) !== stored.result.pageUrl) {
        return { phase: 'idle', tabId: tab.id };
      }
      return { phase: 'done', tabId: tab.id, state: stored };
  }
}

async function getActiveTab(): Promise<Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id === undefined ? null : { id: tab.id, url: tab.url };
}

export function useScan(): { state: PopupState; startScan: () => void } {
  const [state, setState] = useState<PopupState>({ phase: 'loading' });
  const [tab, setTab] = useState<Tab | null>(null);

  useEffect(() => {
    // Read through a function: the cleanup flips this while an await is pending,
    // which flow analysis cannot see.
    let active = true;
    const isActive = () => active;
    let key: string | null = null;
    let currentTab: Tab | null = null;

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (!isActive() || !currentTab || key === null) return;
      const change = changes[key];
      if (change) setState(toPopupState(currentTab, parseScanState(change.newValue), Date.now()));
    };

    void (async () => {
      const found = await getActiveTab();
      if (!isActive()) return;
      if (!found) {
        setState({ phase: 'no-tab' });
        return;
      }
      currentTab = found;
      key = scanKey(found.id);
      setTab(found);
      chrome.storage.session.onChanged.addListener(onChanged);
      const items = await chrome.storage.session.get(key);
      if (isActive()) setState(toPopupState(found, parseScanState(items[key]), Date.now()));
    })().catch(() => {
      if (isActive()) setState({ phase: 'no-tab' });
    });

    return () => {
      active = false;
      chrome.storage.session.onChanged.removeListener(onChanged);
    };
  }, []);

  const startScan = useCallback(() => {
    if (!tab) return;
    setState({ phase: 'running', tabId: tab.id });
    const message: ScanStartMessage = { type: 'scan:start', tabId: tab.id };
    chrome.runtime
      .sendMessage<ScanStartMessage, ScanStartReply | undefined>(message)
      .then((reply) => {
        // On acceptance the outcome arrives through storage.onChanged.
        if (!reply) setState({ phase: 'error', tabId: tab.id, error: 'scan-failed' });
        else if (!reply.accepted) setState({ phase: 'error', tabId: tab.id, error: reply.error });
      })
      .catch(() => {
        setState({ phase: 'error', tabId: tab.id, error: 'scan-failed' });
      });
  }, [tab]);

  return { state, startScan };
}
