import { FIXTURE_ORIGIN } from '../../playwright.config';
import type { ScanState } from '../../src/storage/scan-store';
import { expect, test } from './fixtures';

test('SC-E2E-013 reports the known SEO problems on a real page', async ({
  context,
  popupFor,
  storedScans,
}) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/seo-issues.html`);
  const popup = await popupFor(page);
  await popup.getByRole('button', { name: 'Scan this page' }).click();
  await expect(popup.getByRole('status', { name: 'Scan status' })).toHaveText('Scan complete.', {
    timeout: 20_000,
  });

  const done = Object.values(await storedScans()).find(
    (s): s is Extract<ScanState, { status: 'done' }> =>
      s.status === 'done' && s.result.pageUrl === `${FIXTURE_ORIGIN}/seo-issues.html`,
  );
  const seo = done?.result.findings
    .filter((f) => f.source === 'seo')
    .map((f) => `${f.ruleId}:${f.outcome}`)
    .sort();
  expect(seo).toEqual([
    'seo-canonical-multiple:violation',
    'seo-meta-description-missing:violation',
    'seo-noindex:needs-review',
    'seo-title-length:needs-review',
    'seo-viewport-missing:violation',
  ]);

  // The page has no accessibility violations, so that category has nothing to offer and is hidden.
  await expect(popup.getByRole('checkbox', { name: 'SEO (3)' })).toBeChecked();
  await expect(popup.getByRole('checkbox', { name: /^Accessibility/ })).toHaveCount(0);
  const summaries = popup.getByRole('list', { name: 'Findings' }).locator('summary');
  await expect(summaries).toHaveCount(3);
  await expect(summaries.filter({ hasText: 'SEO' })).toHaveCount(3);
  await expect(summaries.filter({ hasText: 'Page has no viewport meta tag' })).toContainText(
    'Whole page',
  );
});

test('SC-E2E-014 highlighting an element in the page head explains it is not displayed', async ({
  context,
  popupFor,
}) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/seo-issues.html`);
  const popup = await popupFor(page);
  await popup.getByRole('button', { name: 'Scan this page' }).click();
  await expect(popup.getByRole('status', { name: 'Scan status' })).toHaveText('Scan complete.', {
    timeout: 20_000,
  });

  await popup
    .getByRole('list', { name: 'Findings' })
    .locator('summary', { hasText: 'more than one canonical' })
    .click();
  await popup
    .getByRole('button', { name: /^Highlight on page: html > head > link/ })
    .first()
    .click();
  await expect(popup.getByRole('status', { name: 'Highlight status' })).toHaveText(
    /not displayed on the page/,
  );
});
