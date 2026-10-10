import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { isScanResult } from '../../src/messaging/guards';
import type { ScanResult } from '../../src/shared/types/scan';

/*
 * Runs the built scanner (dist/scanner.js: axe-core, SEO checks and
 * normalization) on real public pages to check it copes with real-world
 * markup: it must finish within the extension's 25 s limit, produce a result
 * the extension would accept, and stay far below storage limits.
 *
 * Difference from the extension: the scanner is evaluated in the page's own
 * JavaScript world rather than the extension's isolated world, so page scripts
 * could interfere here in ways they cannot in the real extension.
 *
 * Results go to test-results/real-sites.json for the record in docs/accuracy.md.
 */

const SITES = [
  'https://www.w3.org/',
  'https://www.w3.org/WAI/',
  'https://developer.mozilla.org/en-US/',
  'https://www.gov.uk/',
  'https://en.wikipedia.org/wiki/Web_accessibility',
  'https://github.com/',
  'https://news.ycombinator.com/',
  'https://www.bbc.co.uk/news',
];

const SCAN_LIMIT_MS = 25_000;
/** chrome.storage.session allows 10 MB in total; one result should be a small fraction. */
const RESULT_SIZE_LIMIT = 1_000_000;

const scannerSource = readFile(resolve(import.meta.dirname, '../../dist/scanner.js'), 'utf8');
const summary: Record<string, unknown>[] = [];

test.afterAll(async () => {
  const dir = resolve(import.meta.dirname, '../../test-results');
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, 'real-sites.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.table(summary);
});

for (const url of SITES) {
  test(`SC-SMOKE-001 scans ${url}`, async ({ page }) => {
    // Users scan once a page looks ready; some news sites never fire 'load' because
    // third-party content keeps streaming, so wait for the parsed document instead.
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    } catch (error) {
      // A site that will not load says nothing about SiteCheck: inconclusive, not a failure.
      summary.push({ url, ms: 'not loaded' });
      test.skip(
        true,
        `page did not load: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    await page.evaluate(await scannerSource);

    const started = Date.now();
    const result = await page.evaluate(() =>
      (globalThis as unknown as { __siteCheckScan: () => Promise<unknown> }).__siteCheckScan(),
    );
    const elapsed = Date.now() - started;
    const size = JSON.stringify(result).length;

    expect(isScanResult(result), 'result passes the extension’s own validation').toBe(true);
    const scan = result as ScanResult;
    const count = (outcome: string, source?: string) =>
      scan.findings.filter((f) => f.outcome === outcome && (!source || f.source === source)).length;

    summary.push({
      url,
      ms: elapsed,
      kb: Math.round(size / 1024),
      violations: count('violation', 'axe'),
      review: count('needs-review', 'axe'),
      seo: count('violation', 'seo') + count('needs-review', 'seo'),
      passed: scan.passedRuleCount,
      rules: scan.findings
        .filter((f) => f.outcome === 'violation')
        .map((f) => f.ruleId)
        .join(' '),
    });

    expect(elapsed).toBeLessThan(SCAN_LIMIT_MS);
    expect(size).toBeLessThan(RESULT_SIZE_LIMIT);
    // Query strings and fragments never reach a stored result.
    expect(scan.pageUrl).not.toMatch(/[?#]/);
  });
}
