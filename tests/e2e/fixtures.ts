import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test';

/**
 * An extension cannot be loaded into Playwright's default browser. It needs
 * `launchPersistentContext` with `--load-extension`, using the bundled
 * Chromium (`channel: 'chromium'`) in the new headless mode: branded Chrome
 * ignores the flag, and the old headless shell silently loads no extensions.
 */

const EXTENSION_PATH = resolve(import.meta.dirname, '../../dist');

export interface ExtensionFixtures {
  context: BrowserContext;
  serviceWorker: Worker;
  /** Needed to build chrome-extension:// URLs. */
  extensionId: string;
}

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture deps from this pattern.
  context: async ({}, use) => {
    const userDataDir = await mkdtemp(join(tmpdir(), 'sitecheck-profile-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await use(context);
    await context.close();
    await rm(userDataDir, { recursive: true, force: true });
  },

  serviceWorker: async ({ context }, use) => {
    // The worker may have started before this fixture ran.
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(worker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },
});

export const expect = test.expect;
