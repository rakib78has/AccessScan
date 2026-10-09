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

export function buildManifest(version: string): chrome.runtime.ManifestV3 {
  return {
    manifest_version: 3,
    name: 'SiteCheck',
    description: 'Find common accessibility and basic SEO issues on the page you are viewing.',
    version,
    minimum_chrome_version: MINIMUM_CHROME_VERSION,
    // Milestone 1 only renders the popup, so it needs no permissions yet.
    permissions: [],
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
  };
}

function icons(): Record<string, string> {
  return {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  };
}
