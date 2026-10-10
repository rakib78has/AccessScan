import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/popup/App';
import { scanErrorMessage } from '../../src/shared/errors';
import { scanKey } from '../../src/storage/scan-store';
import { installFakeChrome } from '../helpers/fake-chrome';
import { makeFinding, makeScanResult } from '../helpers/scan-data';

afterEach(() => {
  // Unmount before removing the fake chrome global, which effect cleanups still use.
  cleanup();
  vi.unstubAllGlobals();
});

const scanStatus = () => screen.getByRole('status', { name: 'Scan status' });
const scanButton = () => screen.getByRole('button', { name: /scan this page|scanning/i });

async function renderReady() {
  render(<App />);
  // The popup reads the active tab and stored state asynchronously on open.
  await waitFor(() => {
    expect(scanButton()).toBeEnabled();
  });
}

async function expectNoAxeViolations(container: HTMLElement) {
  // jsdom has no layout engine, so contrast is checked in real Chromium instead.
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

describe('SC-UI-001 popup shell', () => {
  it('shows the product heading and the automation disclaimer', async () => {
    installFakeChrome();
    await renderReady();
    expect(screen.getByRole('heading', { level: 1, name: 'SiteCheck' })).toBeInTheDocument();
    expect(screen.getByTestId('automation-disclaimer')).toHaveTextContent(
      /does not mean a page meets WCAG/,
    );
  });
});

describe('SC-UI-002 popup accessibility', () => {
  it('has no axe violations when idle', async () => {
    installFakeChrome();
    await renderReady();
    await expectNoAxeViolations(document.body);
  });

  it('has no axe violations when showing results', async () => {
    const { session } = installFakeChrome();
    await session.set({ [scanKey(5)]: { status: 'done', result: makeScanResult() } });
    render(<App />);
    await screen.findByText('Scan complete.');
    await expectNoAxeViolations(document.body);
  });
});

describe('SC-UI-003 scanning from the popup', () => {
  it('asks the service worker to scan the active tab and shows progress', async () => {
    const { sendMessage } = installFakeChrome();
    await renderReady();

    await userEvent.click(scanButton());

    expect(sendMessage).toHaveBeenCalledWith({ type: 'scan:start', tabId: 5 });
    expect(scanButton()).toBeDisabled();
    expect(scanButton()).toHaveAttribute('aria-busy', 'true');
    expect(scanStatus()).toHaveTextContent('Scanning this page…');
  });

  it('shows the summary when the result arrives in storage', async () => {
    const { session } = installFakeChrome();
    await renderReady();
    await userEvent.click(scanButton());

    const result = makeScanResult({
      findings: [
        makeFinding({ ruleId: 'image-alt', impact: 'critical' }),
        makeFinding({ ruleId: 'label', impact: 'critical' }),
        makeFinding({ ruleId: 'region', impact: 'moderate' }),
        makeFinding({ ruleId: 'color-contrast', outcome: 'needs-review', impact: 'serious' }),
      ],
      passedRuleCount: 37,
    });
    await act(() => session.set({ [scanKey(5)]: { status: 'done', result } }));

    expect(scanStatus()).toHaveTextContent('Scan complete.');
    expect(screen.getByTestId('count-violations')).toHaveTextContent('3');
    expect(screen.getByTestId('count-needs-review')).toHaveTextContent('1');
    expect(screen.getByTestId('count-passed')).toHaveTextContent('37');
    expect(scanButton()).toBeEnabled();
  });

  it('shows a stored error when the scan fails after starting', async () => {
    const { session } = installFakeChrome();
    await renderReady();
    await userEvent.click(scanButton());
    await act(() => session.set({ [scanKey(5)]: { status: 'error', error: 'navigated', at: 1 } }));
    expect(screen.getByTestId('scan-error')).toHaveTextContent(scanErrorMessage('navigated'));
  });

  it('shows why a page was refused', async () => {
    installFakeChrome({ reply: { accepted: false, error: 'restricted-page' } });
    await renderReady();
    await userEvent.click(scanButton());
    expect(await screen.findByTestId('scan-error')).toHaveTextContent(
      scanErrorMessage('restricted-page'),
    );
    expect(scanButton()).toBeEnabled();
  });

  it('reports a failure when the service worker cannot be reached', async () => {
    installFakeChrome({ reply: () => Promise.reject(new Error('Receiving end does not exist.')) });
    await renderReady();
    await userEvent.click(scanButton());
    expect(await screen.findByTestId('scan-error')).toHaveTextContent(
      scanErrorMessage('scan-failed'),
    );
  });

  it('ignores updates for other tabs', async () => {
    const { session } = installFakeChrome();
    await renderReady();
    await act(() => session.set({ [scanKey(6)]: { status: 'running', startedAt: Date.now() } }));
    expect(scanButton()).toBeEnabled();
  });

  it('can be operated with the keyboard alone', async () => {
    const { sendMessage } = installFakeChrome();
    await renderReady();
    const user = userEvent.setup();
    await user.tab();
    expect(scanButton()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe('SC-UI-004 reopening the popup', () => {
  it('shows the last result for the current page', async () => {
    const { session } = installFakeChrome();
    await session.set({ [scanKey(5)]: { status: 'done', result: makeScanResult() } });
    render(<App />);
    expect(await screen.findByTestId('count-violations')).toHaveTextContent('1');
  });

  it('shows a scan still running in the background', async () => {
    const { session } = installFakeChrome();
    await session.set({ [scanKey(5)]: { status: 'running', startedAt: Date.now() } });
    render(<App />);
    expect(await screen.findByText('Scanning this page…')).toBeInTheDocument();
    expect(scanButton()).toBeDisabled();
  });

  it('renders page-provided text as text, never as markup', async () => {
    const { session } = installFakeChrome();
    const result = makeScanResult({
      engine: { name: 'axe-core', version: '<img src=x onerror=alert(1)>' },
    });
    await session.set({ [scanKey(5)]: { status: 'done', result } });
    render(<App />);
    await screen.findByText('Scan complete.');
    expect(document.querySelector('img')).toBeNull();
  });

  it('offers no scan when there is no active tab', async () => {
    installFakeChrome({ tab: null });
    render(<App />);
    expect(await screen.findByText('Open a web page, then scan it.')).toBeInTheDocument();
    expect(scanButton()).toBeDisabled();
  });

  it('stops listening to storage when closed', async () => {
    const { session } = installFakeChrome();
    const { unmount } = render(<App />);
    await waitFor(() => {
      expect(scanButton()).toBeEnabled();
    });
    expect(session.listenerCount()).toBe(1);
    unmount();
    expect(session.listenerCount()).toBe(0);
  });
});
