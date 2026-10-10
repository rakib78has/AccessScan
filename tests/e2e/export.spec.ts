import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { FIXTURE_ORIGIN } from '../../playwright.config';
import type { JsonReport } from '../../src/reports/report-types';
import { CSV_COLUMNS } from '../../src/reports/exporters/csv';
import { parseCsv } from '../helpers/csv-parse';
import { expect, test } from './fixtures';

async function scannedPopup(page: Page, popupFor: (page: Page) => Promise<Page>) {
  await page.goto(`${FIXTURE_ORIGIN}/violations.html`);
  const popup = await popupFor(page);
  await popup.getByRole('button', { name: 'Scan this page' }).click();
  await expect(popup.getByRole('status', { name: 'Scan status' })).toHaveText('Scan complete.', {
    timeout: 20_000,
  });
  return popup;
}

async function downloadFrom(popup: Page, name: 'Download JSON' | 'Download CSV') {
  const [download] = await Promise.all([
    popup.waitForEvent('download'),
    popup.getByRole('button', { name }).click(),
  ]);
  const path = await download.path();
  return { filename: download.suggestedFilename(), content: await readFile(path, 'utf8') };
}

test('SC-E2E-015 downloads a JSON report matching the scan', async ({ context, popupFor }) => {
  const page = await context.newPage();
  const popup = await scannedPopup(page, popupFor);

  const { filename, content } = await downloadFrom(popup, 'Download JSON');
  expect(filename).toMatch(/^sitecheck-127\.0\.0\.1-\d{8}-\d{4}\.json$/);

  const report = JSON.parse(content) as JsonReport;
  expect(report.page.url).toBe(`${FIXTURE_ORIGIN}/violations.html`);
  expect(report.summary.violations).toBe(4);
  expect(report.findings.map((f) => f.ruleId)).toEqual(
    expect.arrayContaining(['image-alt', 'label', 'color-contrast', 'link-name']),
  );
  expect(report.disclaimer).toContain('does not mean the page meets WCAG');
  await expect(popup.getByRole('status', { name: 'Export status' })).toHaveText(
    `Saved ${filename}.`,
  );
});

test('SC-E2E-016 downloads a CSV report with one row per affected element', async ({
  context,
  popupFor,
}) => {
  const page = await context.newPage();
  const popup = await scannedPopup(page, popupFor);

  const { filename, content } = await downloadFrom(popup, 'Download CSV');
  expect(filename).toMatch(/\.csv$/);
  expect(content.startsWith('\uFEFF')).toBe(true);

  const rows = parseCsv(content.slice(1));
  expect(rows[0]).toEqual([...CSV_COLUMNS]);
  const element = CSV_COLUMNS.indexOf('Element');
  const violations = rows.filter((r) => r[CSV_COLUMNS.indexOf('Outcome')] === 'Violation');
  expect(violations.map((r) => r[element]).sort()).toEqual(
    ['#empty-link', '#low-contrast', '#missing-alt', '#unlabeled'].sort(),
  );
});
