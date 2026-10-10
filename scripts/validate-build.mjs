/**
 * Validates the built extension in dist/ before it is packaged or released.
 *
 * Enforces the permission policy in docs/security.md mechanically, so a
 * broader permission cannot slip into a release through an innocent-looking
 * manifest edit. Exits non-zero with every problem listed.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The only API permissions SiteCheck may ever request without a policy review. */
export const ALLOWED_PERMISSIONS = ['activeTab', 'scripting', 'storage'];

/** Keys that would grant access to pages beyond the one the user clicked on. */
const FORBIDDEN_KEYS = [
  'host_permissions',
  'optional_host_permissions',
  'content_scripts',
  'externally_connectable',
];

/** Files the service worker injects with chrome.scripting.executeScript. */
export const INJECTED_FILES = ['scanner.js'];

/** Licence notices for bundled third-party code (MIT, MPL-2.0); see vite.notices.ts. */
export const NOTICE_FILES = ['THIRD_PARTY_NOTICES.txt', 'THIRD_PARTY_NOTICES_SCANNER.txt'];

const FORBIDDEN_FILE = /\.(pem|crx|env)$|(^|\/)\.env/;

/**
 * Dynamic code and network calls must never appear in SiteCheck's own bundles
 * (popup, service worker). The injected scanner is exempt: it bundles
 * axe-core, whose template and plugin code contains `new Function` and an
 * optional stylesheet download that SiteCheck switches off (see
 * docs/security.md).
 */
const FORBIDDEN_CODE = [
  { pattern: /\beval\s*\(/, name: 'eval()' },
  { pattern: /\bnew Function\b/, name: 'new Function' },
  { pattern: /\bfetch\s*\(/, name: 'fetch()' },
  { pattern: /\bXMLHttpRequest\b/, name: 'XMLHttpRequest' },
  { pattern: /\bWebSocket\b/, name: 'WebSocket' },
  { pattern: /\bsendBeacon\b/, name: 'sendBeacon' },
];
const CHROME_VERSION = /^\d{1,5}(\.\d{1,5}){0,3}$/;

/**
 * @param {{
 *   manifest: Record<string, any>,
 *   files: string[],
 *   packageVersion: string,
 *   sources?: Record<string, string>,
 * }} build
 *   `files` are paths relative to dist/, using forward slashes. `sources` maps
 *   JavaScript file paths to their contents.
 * @returns {string[]} problems found; empty when the build is valid.
 */
export function validateBuild({ manifest, files, packageVersion, sources = {} }) {
  const errors = [];
  const fileSet = new Set(files);

  if (manifest.manifest_version !== 3) errors.push('manifest_version must be 3');
  if (!manifest.name) errors.push('name is required');
  if (typeof manifest.description !== 'string' || manifest.description.length > 132) {
    errors.push('description is required and must be at most 132 characters');
  }
  if (!CHROME_VERSION.test(String(manifest.version))) {
    errors.push(`version "${manifest.version}" is not a valid Chrome extension version`);
  }
  if (manifest.version !== packageVersion) {
    errors.push(
      `manifest version ${manifest.version} does not match package.json ${packageVersion}`,
    );
  }

  for (const key of FORBIDDEN_KEYS) {
    if (key in manifest) errors.push(`${key} is not allowed by the permission policy`);
  }
  for (const permission of manifest.permissions ?? []) {
    if (!ALLOWED_PERMISSIONS.includes(permission)) {
      errors.push(`permission "${permission}" is not in the allowlist`);
    }
  }

  const csp = JSON.stringify(manifest.content_security_policy ?? '');
  if (/unsafe-eval|unsafe-inline|https?:/.test(csp)) {
    errors.push('content_security_policy must not allow eval, inline scripts, or remote sources');
  }
  // Without an explicit policy Chrome's default applies, which trusts localhost scripts.
  if (!manifest.content_security_policy?.extension_pages?.includes("script-src 'self'")) {
    errors.push("content_security_policy.extension_pages must set script-src 'self'");
  }

  const referenced = [
    manifest.action?.default_popup,
    manifest.background?.service_worker,
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
  ].filter(Boolean);
  for (const path of referenced) {
    if (!fileSet.has(path)) errors.push(`manifest references missing file ${path}`);
  }
  // Injected by path at runtime, so the manifest does not mention it.
  for (const path of INJECTED_FILES) {
    if (!fileSet.has(path)) errors.push(`build is missing injected file ${path}`);
  }
  for (const path of NOTICE_FILES) {
    if (!fileSet.has(path)) errors.push(`build is missing licence notices ${path}`);
  }

  for (const file of files) {
    if (FORBIDDEN_FILE.test(file)) errors.push(`build must not contain ${file}`);
  }

  for (const [file, source] of Object.entries(sources)) {
    if (INJECTED_FILES.includes(file)) continue;
    for (const { pattern, name } of FORBIDDEN_CODE) {
      if (pattern.test(source)) errors.push(`${file} must not contain ${name}`);
    }
  }

  return errors;
}

/** @param {string} dir */
function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).replaceAll('\\', '/'));
}

function main() {
  const root = resolve(import.meta.dirname, '..');
  const dist = join(root, 'dist');
  if (!existsSync(join(dist, 'manifest.json'))) {
    console.error('dist/manifest.json not found. Run `npm run build` first.');
    process.exit(1);
  }

  const files = listFiles(dist);
  const sources = Object.fromEntries(
    files.filter((f) => f.endsWith('.js')).map((f) => [f, readFileSync(join(dist, f), 'utf8')]),
  );
  const errors = validateBuild({
    manifest: JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8')),
    files,
    packageVersion: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version,
    sources,
  });

  if (errors.length > 0) {
    console.error(`Build validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    process.exit(1);
  }
  console.log('Build validation passed.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
