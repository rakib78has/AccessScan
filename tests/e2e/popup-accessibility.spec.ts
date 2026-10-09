import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { AxeResults } from 'axe-core';
import { expect, test } from './fixtures';

const axeSource = readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

for (const colorScheme of ['light', 'dark'] as const) {
  test(`SC-E2E-002 popup has no axe violations, including contrast (${colorScheme})`, async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.emulateMedia({ colorScheme });
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Evaluated over the DevTools protocol, so the popup's CSP does not block it.
    await page.evaluate(await axeSource);
    const results = await page.evaluate(() =>
      (window as unknown as { axe: { run: () => Promise<AxeResults> } }).axe.run(),
    );

    expect(results.violations.map((v) => `${v.id}: ${String(v.nodes.length)} node(s)`)).toEqual([]);
    expect(results.passes.map((p) => p.id)).toContain('color-contrast');
  });
}
