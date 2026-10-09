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

  it('rejects a CSP that allows eval or remote code', () => {
    const csp = { extension_pages: "script-src 'self' 'unsafe-eval'; object-src 'self'" };
    expect(validate({ content_security_policy: csp })).toHaveLength(1);
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
