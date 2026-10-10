/**
 * Checks that a release tag is consistent before anything is published:
 * the tag is vX.Y.Z, matches package.json, and CHANGELOG.md has a
 * non-empty section for that version. Optionally writes that section out
 * as the release notes.
 *
 *   node scripts/release-check.mjs v0.2.0 [--notes release-notes.md]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Chrome extension versions are dot-separated integers, so no pre-release suffixes. */
const TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/**
 * @param {string} changelog
 * @param {string} version
 * @returns {string | null} the section body, trimmed, or null if absent or empty
 */
export function extractReleaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const heading = new RegExp(`^## \\[${version.replaceAll('.', '\\.')}\\]`);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
  return body === '' ? null : body;
}

/**
 * @param {{ tag: string, packageVersion: string, changelog: string }} release
 * @returns {string[]} problems; empty when the release is consistent
 */
export function checkRelease({ tag, packageVersion, changelog }) {
  const match = TAG.exec(tag);
  if (!match) return [`tag "${tag}" must look like v1.2.3`];
  const version = tag.slice(1);
  const errors = [];
  if (version !== packageVersion) {
    errors.push(`tag ${tag} does not match package.json version ${packageVersion}`);
  }
  if (extractReleaseNotes(changelog, version) === null) {
    errors.push(`CHANGELOG.md has no non-empty "## [${version}]" section`);
  }
  return errors;
}

function main() {
  const [tag = '', flag, notesPath] = process.argv.slice(2);
  const root = resolve(import.meta.dirname, '..');
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

  const errors = checkRelease({ tag, packageVersion: version, changelog });
  if (errors.length > 0) {
    console.error(`Release check failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    process.exit(1);
  }
  if (flag === '--notes' && notesPath) {
    writeFileSync(notesPath, `${extractReleaseNotes(changelog, version) ?? ''}\n`);
  }
  console.log(`Release check passed for ${tag}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
