import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { FIXTURE_ORIGIN } from '../../playwright.config';
import type { ScanResult } from '../../src/shared/types/scan';
import type { ScanState } from '../../src/storage/scan-store';
import { expect, test } from './fixtures';

/*
 * Golden-file regression suite. Each fixture page is scanned in real
 * Chromium and its findings (rule, outcome, affected elements) are compared
 * with tests/fixtures/expected/<page>.json. Any change, such as an axe-core
 * upgrade that adds, drops or reclassifies a finding, fails with the exact
 * difference.
 *
 * After an intended change, regenerate with:
 *   UPDATE_GOLDEN=1 npx playwright test tests/e2e/regression.spec.ts
 * and review the diff line by line before committing. A golden file records
 * what SiteCheck reports, not what is true: docs/accuracy.md records which
 * entries are known misses.
 */

const EXPECTED_DIR = resolve(import.meta.dirname, '../fixtures/expected');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

/** Fixture pages, with an element to wait for when content appears after load. */
const FIXTURES: { page: string; readySelector?: string }[] = [
  { page: 'clean.html' },
  { page: 'violations.html' },
  { page: 'seo-issues.html' },
  { page: 'contrast.html' },
  { page: 'shadow-dom.html' },
  { page: 'unusual-markup.html' },
  { page: 'dynamic.html', readySelector: '#late-image' },
  { page: 'iframe.html' },
  { page: 'nested-frames.html' },
  { page: 'empty.html' },
  { page: 'bare.html' },
];

interface GoldenFinding {
  outcome: string;
  source: string;
  ruleId: string;
  impact: string | null;
  nodeCount: number;
  targets: string[];
}

/** Keeps only what should be stable between runs; timings and dates are dropped. */
function toGolden(result: ScanResult): GoldenFinding[] {
  return result.findings
    .map((f) => ({
      outcome: f.outcome,
      source: f.source,
      ruleId: f.ruleId,
      impact: f.impact,
      nodeCount: f.nodeCount,
      targets: f.nodes.map((n) => n.target).sort(),
    }))
    .sort((a, b) =>
      `${a.outcome} ${a.source} ${a.ruleId}`.localeCompare(`${b.outcome} ${b.source} ${b.ruleId}`),
    );
}

async function scanFixture(
  page: Page,
  popupFor: (page: Page) => Promise<Page>,
  storedScans: () => Promise<Record<string, ScanState>>,
  fixture: (typeof FIXTURES)[number],
): Promise<ScanResult> {
  await page.goto(`${FIXTURE_ORIGIN}/${fixture.page}`);
  if (fixture.readySelector)
    await page.locator(fixture.readySelector).waitFor({ state: 'attached' });
  const popup = await popupFor(page);
  await popup.getByRole('button', { name: 'Scan this page' }).click();
  await expect(popup.getByRole('status', { name: 'Scan status' })).toHaveText('Scan complete.', {
    timeout: 20_000,
  });
  const done = Object.values(await storedScans()).find(
    (s): s is Extract<ScanState, { status: 'done' }> =>
      s.status === 'done' && s.result.pageUrl === `${FIXTURE_ORIGIN}/${fixture.page}`,
  );
  if (!done) throw new Error(`no stored result for ${fixture.page}`);
  return done.result;
}

for (const fixture of FIXTURES) {
  test(`SC-E2E-017 regression: ${fixture.page} matches its expected findings`, async ({
    context,
    popupFor,
    storedScans,
  }) => {
    const page = await context.newPage();
    const actual = toGolden(await scanFixture(page, popupFor, storedScans, fixture));
    const file = join(EXPECTED_DIR, fixture.page.replace(/\.html$/, '.json'));

    if (UPDATE) {
      await mkdir(EXPECTED_DIR, { recursive: true });
      await writeFile(file, `${JSON.stringify(actual, null, 2)}\n`);
      test.info().annotations.push({ type: 'golden', description: `updated ${file}` });
      return;
    }

    const expected = JSON.parse(await readFile(file, 'utf8')) as GoldenFinding[];
    expect(actual).toEqual(expected);
  });
}

test('SC-E2E-018 scans are snapshots: content added later appears only after a rescan', async ({
  context,
  popupFor,
  storedScans,
}) => {
  const page = await context.newPage();
  const fixture = { page: 'dynamic.html', readySelector: '#late-image' };
  const labelTargets = (r: ScanResult) =>
    r.findings.filter((f) => f.ruleId === 'label').flatMap((f) => f.nodes.map((n) => n.target));

  const before = await scanFixture(page, popupFor, storedScans, fixture);
  expect(labelTargets(before)).toEqual([]);

  await page.locator('#add-field').click();
  await page.locator('#late-input').waitFor({ state: 'attached' });
  // Reload the popup's view of the same tab and scan again.
  const popup = await popupFor(page);
  await popup.getByRole('button', { name: 'Scan this page' }).click();
  await expect(popup.getByRole('status', { name: 'Scan status' })).toHaveText('Scan complete.', {
    timeout: 20_000,
  });
  const after = Object.values(await storedScans()).find(
    (s): s is Extract<ScanState, { status: 'done' }> =>
      s.status === 'done' && s.result.scannedAt !== before.scannedAt,
  );
  expect(after && labelTargets(after.result)).toEqual(['#late-input']);
});

test('SC-E2E-019 a highlight reaches into an open shadow root', async ({ context, popupFor }) => {
  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/shadow-dom.html`);
  const popup = await popupFor(page);
  await popup.getByRole('button', { name: 'Scan this page' }).click();
  await expect(popup.getByRole('status', { name: 'Scan status' })).toHaveText('Scan complete.', {
    timeout: 20_000,
  });

  await popup
    .getByRole('list', { name: 'Findings' })
    .locator('summary', { hasText: 'alternative text' })
    .click();
  await popup.getByRole('button', { name: /^Highlight on page: #open-host >>> / }).click();
  await expect(popup.getByRole('status', { name: 'Highlight status' })).toHaveText(
    'Highlighted on the page.',
  );
  await expect(page.locator('#__sitecheck-highlight')).toHaveCount(1);
});
