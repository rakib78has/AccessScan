import type { Request } from '@playwright/test';
import { FIXTURE_ORIGIN } from '../../playwright.config';
import { expect, test } from './fixtures';

test('SC-SEC-003 scanning, highlighting and exporting make no network requests', async ({
  context,
  popupFor,
}) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/violations.html`);
  await page.waitForLoadState('networkidle');

  // From here on, the page is loaded: anything on the network comes from SiteCheck.
  const requests: string[] = [];
  const record = (request: Request) => {
    const url = request.url();
    // Extension files and inline data: URLs never leave the machine.
    if (!url.startsWith('chrome-extension://') && !url.startsWith('data:')) requests.push(url);
  };
  context.on('request', record);

  const popup = await popupFor(page);
  await popup.getByRole('button', { name: 'Scan this page' }).click();
  await expect(popup.getByRole('status', { name: 'Scan status' })).toHaveText('Scan complete.', {
    timeout: 20_000,
  });
  await popup
    .getByRole('list', { name: 'Findings' })
    .locator('summary', { hasText: 'alternative text' })
    .click();
  await popup.getByRole('button', { name: /^Highlight on page: #missing-alt/ }).click();
  await expect(popup.getByRole('status', { name: 'Highlight status' })).toHaveText(
    'Highlighted on the page.',
  );
  const [download] = await Promise.all([
    popup.waitForEvent('download'),
    popup.getByRole('button', { name: 'Download JSON' }).click(),
  ]);
  await download.path();

  context.off('request', record);
  expect(requests).toEqual([]);
});

test('SC-SEC-004 code in the scanner’s isolated world cannot evaluate strings', async ({
  context,
  serviceWorker,
}) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/clean.html`);

  // The same world SiteCheck's scanner runs in. axe-core contains `new Function`
  // in code paths SiteCheck does not use; this shows they could not run anyway.
  const outcome = await serviceWorker.evaluate(async (origin) => {
    const [tab] = await chrome.tabs.query({ url: `${origin}/*` });
    if (tab?.id === undefined) return 'no tab';
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          // Deliberate: this test exists to prove Chrome blocks string evaluation here.
          // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
          return `allowed ${String(new Function('return 42')())}`;
        } catch (error) {
          return error instanceof Error ? error.name : 'unknown error';
        }
      },
    });
    return injection?.result;
  }, FIXTURE_ORIGIN);

  expect(outcome).toBe('EvalError');
});

test('SC-SEC-005 the extension runs under its strict CSP', async ({ context, extensionId }) => {
  const page = await context.newPage();
  const response = await page.goto(`chrome-extension://${extensionId}/manifest.json`);
  const manifest = (await response?.json()) as { content_security_policy?: unknown };
  expect(manifest.content_security_policy).toEqual({
    extension_pages: "script-src 'self'; object-src 'self'",
  });
  // The popup still renders under it, so nothing SiteCheck ships needs more.
  await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
  await expect(page.getByRole('heading', { level: 1, name: 'SiteCheck' })).toBeVisible();
});
