import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { AxeResults } from 'axe-core';
import type { Page } from '@playwright/test';
import { FIXTURE_ORIGIN } from '../../playwright.config';
import { HIGHLIGHT_OVERLAY_ID } from '../../src/content/highlight';
import { expect, test } from './fixtures';

const axeSource = readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

async function scanFixture(page: Page, popupFor: (page: Page) => Promise<Page>, path: string) {
  await page.goto(`${FIXTURE_ORIGIN}${path}`);
  const popup = await popupFor(page);
  await popup.getByRole('button', { name: 'Scan this page' }).click();
  await expect(popup.getByRole('status', { name: 'Scan status' })).toHaveText('Scan complete.', {
    timeout: 20_000,
  });
  return popup;
}

const summaries = (popup: Page) => popup.getByRole('list', { name: 'Findings' }).locator('summary');

test('SC-E2E-009 lists findings and filters them by outcome and severity', async ({
  context,
  popupFor,
}) => {
  const page = await context.newPage();
  const popup = await scanFixture(page, popupFor, '/violations.html');

  await expect(summaries(popup)).toHaveCount(4);
  await expect(summaries(popup).first()).toContainText('Critical');

  // Filtering by severity narrows the list to matching findings only.
  const critical = popup.getByRole('checkbox', { name: /^Critical/ });
  await critical.uncheck();
  await expect(summaries(popup).filter({ hasText: 'Critical' })).toHaveCount(0);
  await critical.check();
  await expect(summaries(popup)).toHaveCount(4);

  await popup.getByRole('radio', { name: /^Needs review/ }).check();
  // This fixture has nothing axe could not decide, so the empty state says so.
  await expect(popup.getByTestId('findings-empty')).toHaveText(
    'Nothing needs manual review from the automated checks.',
  );
});

test('SC-E2E-010 a finding opens from the keyboard and highlights its element', async ({
  context,
  popupFor,
}) => {
  const page = await context.newPage();
  const popup = await scanFixture(page, popupFor, '/violations.html');

  const imageAlt = summaries(popup).filter({ hasText: 'alternative text' });
  await imageAlt.focus();
  await popup.keyboard.press('Enter');
  const highlight = popup.getByRole('button', { name: 'Highlight on page: #missing-alt' });
  await expect(highlight).toBeVisible();

  await highlight.focus();
  await popup.keyboard.press('Enter');
  await expect(popup.getByRole('status', { name: 'Highlight status' })).toHaveText(
    'Highlighted on the page.',
  );

  // The overlay sits around the element, and the element itself is untouched.
  const overlay = page.locator(`#${HIGHLIGHT_OVERLAY_ID}`);
  const element = await page.locator('#missing-alt').boundingBox();
  const box = await overlay.boundingBox();
  expect(element).not.toBeNull();
  expect(box).not.toBeNull();
  if (element && box) {
    expect(box.x).toBeLessThanOrEqual(element.x);
    expect(box.y).toBeLessThanOrEqual(element.y);
    expect(box.x + box.width).toBeGreaterThanOrEqual(element.x + element.width);
    expect(box.y + box.height).toBeGreaterThanOrEqual(element.y + element.height);
  }
  expect(await page.locator('#missing-alt').getAttribute('style')).toBeNull();

  await expect(overlay).toHaveCount(0, { timeout: 5_000 });
});

test('SC-E2E-011 explains when a highlighted element has left the page', async ({
  context,
  popupFor,
}) => {
  const page = await context.newPage();
  const popup = await scanFixture(page, popupFor, '/violations.html');
  await page.evaluate(() => document.getElementById('missing-alt')?.remove());

  await summaries(popup).filter({ hasText: 'alternative text' }).click();
  await popup.getByRole('button', { name: 'Highlight on page: #missing-alt' }).click();
  await expect(popup.getByRole('status', { name: 'Highlight status' })).toHaveText(
    /no longer on the page/,
  );
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`SC-E2E-012 results view has no axe violations, including contrast (${colorScheme})`, async ({
    context,
    popupFor,
  }) => {
    const page = await context.newPage();
    const popup = await scanFixture(page, popupFor, '/violations.html');
    await popup.emulateMedia({ colorScheme });
    await summaries(popup).first().click();

    await popup.evaluate(await axeSource);
    const results = await popup.evaluate(() =>
      (window as unknown as { axe: { run: () => Promise<AxeResults> } }).axe.run(),
    );
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
    ).toEqual([]);
  });
}
