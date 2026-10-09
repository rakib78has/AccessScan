import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';
import type { ScanState } from '../../src/storage/scan-store';

/**
 * An extension cannot be loaded into Playwright's default browser. It needs
 * `launchPersistentContext` with `--load-extension`, using the bundled
 * Chromium (`channel: 'chromium'`) in the new headless mode: branded Chrome
 * ignores the flag, and the old headless shell silently loads no extensions.
 *
 * This loads dist-e2e/, which differs from the release build only by a host
 * permission for the fixture server (see manifest.config.ts).
 */

const EXTENSION_PATH = resolve(import.meta.dirname, '../../dist-e2e');

export interface ExtensionFixtures {
  context: BrowserContext;
  serviceWorker: Worker;
  /** Needed to build chrome-extension:// URLs. */
  extensionId: string;
  /** Opens the popup UI targeting `page`, as if the toolbar icon were clicked on it. */
  popupFor: (page: Page) => Promise<Page>;
  /** Reads every stored scan, keyed by storage key. */
  storedScans: () => Promise<Record<string, ScanState>>;
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

  popupFor: async ({ context, extensionId }, use) => {
    await use(async (target) => {
      // Playwright cannot open the real popup. Instead the popup page opens as
      // a tab, the target becomes the active tab, and the popup reloads so it
      // reads that tab on start-up exactly as the real popup would.
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup/index.html`);
      await target.bringToFront();
      await popup.reload();
      await popup.getByRole('button', { name: 'Scan this page' }).waitFor();
      return popup;
    });
  },

  storedScans: async ({ serviceWorker }, use) => {
    await use(() =>
      serviceWorker.evaluate<Record<string, ScanState>>(() => chrome.storage.session.get(null)),
    );
  },
});

export const expect = test.expect;
