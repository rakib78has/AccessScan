import type { Page } from '@playwright/test';
import { FIXTURE_ORIGIN } from '../../playwright.config';
import type { ScanResult } from '../../src/shared/types/scan';
import type { ScanState } from '../../src/storage/scan-store';
import { expect, test } from './fixtures';

async function scan(popup: Page) {
  // Click via the DOM: the popup tab is in the background, where Playwright's
  // animation-frame based stability check would never complete.
  await popup.getByRole('button', { name: 'Scan this page' }).dispatchEvent('click');
}

function resultFor(scans: Record<string, ScanState>, path: string): ScanResult {
  const result = Object.values(scans).find(
    (state): state is Extract<ScanState, { status: 'done' }> =>
      state.status === 'done' && state.result.pageUrl === `${FIXTURE_ORIGIN}${path}`,
  )?.result;
  if (!result) throw new Error(`no stored result for ${path}`);
  return result;
}

function targetsOf(result: ScanResult, ruleId: string, outcome = 'violation'): string[] {
  return result.findings
    .filter((f) => f.ruleId === ruleId && f.outcome === outcome)
    .flatMap((f) => f.nodes.map((n) => n.target));
}

test('SC-E2E-003 finds the known problems on a page and summarizes them', async ({
  context,
  popupFor,
  storedScans,
}) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/violations.html?token=secret#frag`);
  const popup = await popupFor(page);

  await scan(popup);
  await expect(popup.getByRole('status')).toHaveText('Scan complete.', { timeout: 20_000 });
  await expect(popup.getByTestId('count-violations')).toHaveText('4');

  const result = resultFor(await storedScans(), '/violations.html');
  expect(targetsOf(result, 'image-alt')).toEqual(['#missing-alt']);
  expect(targetsOf(result, 'label')).toEqual(['#unlabeled']);
  expect(targetsOf(result, 'color-contrast')).toEqual(['#low-contrast']);
  expect(targetsOf(result, 'link-name')).toEqual(['#empty-link']);
  // The query string and fragment are dropped before anything is stored.
  expect(JSON.stringify(result)).not.toContain('secret');
});

test('SC-E2E-004 reports no violations on the clean page', async ({
  context,
  popupFor,
  storedScans,
}) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/clean.html`);
  const popup = await popupFor(page);

  await scan(popup);
  await expect(popup.getByRole('status')).toHaveText('Scan complete.', { timeout: 20_000 });
  await expect(popup.getByTestId('count-violations')).toHaveText('0');

  const result = resultFor(await storedScans(), '/clean.html');
  expect(result.findings.filter((f) => f.outcome === 'violation')).toEqual([]);
  expect(result.passedRuleCount).toBeGreaterThan(10);
});

test('SC-E2E-005 repeated scans give identical findings', async ({
  context,
  popupFor,
  storedScans,
}) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/violations.html`);
  const popup = await popupFor(page);
  const status = popup.getByRole('status');

  await scan(popup);
  await expect(status).toHaveText('Scan complete.', { timeout: 20_000 });
  const first = resultFor(await storedScans(), '/violations.html');

  await scan(popup);
  await expect(status).toHaveText('Scanning this page…');
  await expect(status).toHaveText('Scan complete.', { timeout: 20_000 });
  const second = resultFor(await storedScans(), '/violations.html');

  expect(second.scannedAt).not.toBe(first.scannedAt);
  expect(second.findings).toEqual(first.findings);
});

test('SC-E2E-006 explains that browser pages cannot be scanned', async ({ context, popupFor }) => {
  const page = await context.newPage();
  await page.goto('chrome://version');
  const popup = await popupFor(page);

  await scan(popup);
  await expect(popup.getByTestId('scan-error')).toContainText(
    'Chrome does not let extensions scan this kind of page',
  );
});

test('SC-E2E-007 finishes promptly on a page with a cross-origin frame', async ({
  context,
  popupFor,
  storedScans,
}) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/iframe.html`);
  await page.frameLocator('#third-party').locator('h1').waitFor();
  const popup = await popupFor(page);

  await scan(popup);
  await expect(popup.getByRole('status')).toHaveText('Scan complete.', { timeout: 20_000 });

  // The frame's content was not tested, and the result must say so.
  const result = resultFor(await storedScans(), '/iframe.html');
  expect(targetsOf(result, 'frame-tested', 'needs-review')).toEqual(['#third-party']);
});

test('SC-E2E-008 a navigation during a scan never leaves a result for the wrong page', async ({
  context,
  popupFor,
}) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/large.html`);
  const popup = await popupFor(page);

  await scan(popup);
  await expect(popup.getByRole('status')).toHaveText('Scanning this page…');
  await page.goto(`${FIXTURE_ORIGIN}/clean.html`);

  // Depending on timing the scan is abandoned ("navigated") or finishes for the
  // old page. Either way, reopening the popup on the new page must not show it.
  await expect(popup.getByRole('button', { name: 'Scan this page' })).toBeEnabled({
    timeout: 30_000,
  });
  const reopened = await popupFor(page);
  await expect(reopened.getByTestId('count-violations')).toHaveCount(0);
});
