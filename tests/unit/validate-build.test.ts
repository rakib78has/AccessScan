import { describe, expect, it } from 'vitest';
import { buildManifest } from '../../manifest.config.ts';
import { validateBuild } from '../../scripts/validate-build.mjs';

const VERSION = '0.1.0';
const FILES = [
  'manifest.json',
  'popup/index.html',
  'service-worker.js',
  'scanner.js',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

function validate(overrides: Record<string, unknown> = {}, files = FILES) {
  const manifest = { ...buildManifest(VERSION), ...overrides };
  return validateBuild({ manifest, files, packageVersion: VERSION });
}

describe('SC-UNIT-002 validateBuild', () => {
  it('accepts the manifest the build generates', () => {
    expect(validate()).toEqual([]);
  });

  it('rejects the end-to-end test manifest, so it can never be released', () => {
    const manifest = buildManifest(VERSION, { e2eFixtureAccess: true });
    expect(validateBuild({ manifest, files: FILES, packageVersion: VERSION })).toEqual([
      'host_permissions is not allowed by the permission policy',
    ]);
  });

  it('requires the injected scanner, which the manifest does not reference', () => {
    const files = FILES.filter((file) => file !== 'scanner.js');
    expect(validate({}, files)).toEqual(['build is missing injected file scanner.js']);
  });

  it.each([
    ['host_permissions', ['<all_urls>']],
    ['optional_host_permissions', ['https://*/*']],
    ['content_scripts', [{ matches: ['<all_urls>'], js: ['x.js'] }]],
    ['externally_connectable', { matches: ['https://example.com/*'] }],
  ])('rejects %s', (key, value) => {
    expect(validate({ [key]: value })).toContainEqual(expect.stringContaining(key));
  });

  it('rejects permissions outside the allowlist', () => {
    expect(validate({ permissions: ['activeTab', 'tabs'] })).toEqual([
      'permission "tabs" is not in the allowlist',
    ]);
  });

  it.each([
    "script-src 'self' 'unsafe-eval'; object-src 'self'",
    "script-src 'self' http://localhost:*; object-src 'self'",
    "script-src 'self' https://cdn.example.com; object-src 'self'",
  ])('rejects the loosened CSP %s', (policy) => {
    expect(validate({ content_security_policy: { extension_pages: policy } })).toEqual([
      'content_security_policy must not allow eval, inline scripts, or remote sources',
    ]);
  });

  it("requires an explicit CSP, since Chrome's default trusts localhost scripts", () => {
    expect(validate({ content_security_policy: undefined })).toEqual([
      "content_security_policy.extension_pages must set script-src 'self'",
    ]);
  });

  describe('dynamic code and network calls in SiteCheck’s own bundles', () => {
    const run = (sources: Record<string, string>) =>
      validateBuild({
        manifest: buildManifest(VERSION),
        files: FILES,
        packageVersion: VERSION,
        sources,
      });

    it.each([
      ['eval(', 'eval()'],
      ['x = new Function("a", "b")', 'new Function'],
      ['fetch("https://evil.example")', 'fetch()'],
      ['new XMLHttpRequest()', 'XMLHttpRequest'],
      ['new WebSocket(u)', 'WebSocket'],
      ['navigator.sendBeacon(u, d)', 'sendBeacon'],
    ])('rejects %s in the service worker', (code, name) => {
      expect(run({ 'service-worker.js': code })).toEqual([
        `service-worker.js must not contain ${name}`,
      ]);
    });

    it('allows the injected scanner, which bundles axe-core', () => {
      expect(run({ 'scanner.js': 'return new Function("def", code)' })).toEqual([]);
    });

    it('does not mistake look-alike words for calls', () => {
      expect(run({ 'assets/popup.js': 'const prefetch = 1; retrieval(); evaluate();' })).toEqual(
        [],
      );
    });
  });

  it('rejects a version that differs from package.json', () => {
    expect(validate({ version: '0.2.0' })).toContainEqual(
      expect.stringContaining('does not match package.json'),
    );
  });

  it('reports manifest references to files missing from the build', () => {
    const files = FILES.filter((file) => file !== 'service-worker.js');
    expect(validate({}, files)).toEqual(['manifest references missing file service-worker.js']);
  });

  it.each(['key.pem', 'sitecheck.crx', '.env', 'nested/.env.local'])(
    'rejects secrets or signing artifacts such as %s',
    (file) => {
      expect(validate({}, [...FILES, file])).toEqual([`build must not contain ${file}`]);
    },
  );
});
