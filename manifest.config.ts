/**
 * The extension manifest, generated at build time so its version can never
 * drift from package.json.
 *
 * Permission policy (see docs/security.md): SiteCheck reads a page only after
 * the user clicks the toolbar icon on it. That is what `activeTab` grants, so
 * the manifest must never declare `host_permissions` or `content_scripts`;
 * scripts/validate-build.mjs fails the build if either appears.
 */

export const MINIMUM_CHROME_VERSION = '116';

export interface ManifestOptions {
  /**
   * Adds host access to the local fixture server. Playwright cannot click the
   * toolbar icon, so end-to-end tests cannot obtain an activeTab grant; only
   * the separate dist-e2e build uses this, and the release validator rejects it.
   */
  e2eFixtureAccess?: boolean;
}

export const E2E_HOST_PERMISSION = 'http://127.0.0.1/*';

export function buildManifest(
  version: string,
  options: ManifestOptions = {},
): chrome.runtime.ManifestV3 {
  return {
    manifest_version: 3,
    name: 'SiteCheck',
    description: 'Find common accessibility and basic SEO issues on the page you are viewing.',
    version,
    minimum_chrome_version: MINIMUM_CHROME_VERSION,
    // activeTab: temporary access to the tab the user clicked on.
    // scripting: inject the scanner into that tab. storage: chrome.storage.session.
    permissions: ['activeTab', 'scripting', 'storage'],
    ...(options.e2eFixtureAccess ? { host_permissions: [E2E_HOST_PERMISSION] } : {}),
    action: {
      default_title: 'SiteCheck',
      default_popup: 'popup/index.html',
      default_icon: icons(),
    },
    icons: icons(),
    background: {
      service_worker: 'service-worker.js',
      type: 'module',
    },
    // Stricter than Chrome's default, which also trusts scripts from
    // http://localhost:* and http://127.0.0.1:* for development convenience.
    content_security_policy: {
      extension_pages: EXTENSION_PAGES_CSP,
    },
  };
}

export const EXTENSION_PAGES_CSP = "script-src 'self'; object-src 'self'";

function icons(): Record<string, string> {
  return {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  };
}
