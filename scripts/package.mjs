/**
 * Packages the validated build in dist/ as release/sitecheck-<version>.zip,
 * ready to upload to the Chrome Web Store, plus a SHA-256 checksum file.
 *
 * The zip is reproducible: files are sorted and every entry gets the same
 * fixed timestamp, so building the same commit twice gives identical bytes
 * and the checksum can be verified independently. Source maps are left out.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { zipSync } from 'fflate';
import { validateBuild } from './validate-build.mjs';

/** 1 January 2026, 00:00 local time: any fixed date works, it only has to never change. */
const FIXED_MTIME = new Date(2026, 0, 1);

/** @param {string} path */
export function isPackaged(path) {
  return !path.endsWith('.map');
}

/**
 * @param {Record<string, Uint8Array>} files paths relative to dist/, forward slashes
 * @returns {Uint8Array}
 */
export function createZip(files) {
  /** @type {Record<string, [Uint8Array, { mtime: Date }]>} */
  const entries = {};
  for (const path of Object.keys(files).filter(isPackaged).sort()) {
    const data = files[path];
    if (data) entries[path] = [data, { mtime: FIXED_MTIME }];
  }
  return zipSync(entries, { level: 9 });
}

/** @param {Uint8Array} data */
export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** @param {string} dir */
function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).replaceAll('\\', '/'));
}

/**
 * Validates dist/ and writes the zip and checksum into outDir.
 * @param {{ distDir: string, outDir: string, packageVersion: string }} options
 * @returns {{ zipPath: string, checksumPath: string, hash: string, fileCount: number }}
 */
export function packageBuild({ distDir, outDir, packageVersion }) {
  if (!existsSync(join(distDir, 'manifest.json'))) {
    throw new Error(`${distDir}/manifest.json not found. Run \`npm run build\` first.`);
  }
  const paths = listFiles(distDir);
  /** @type {Record<string, Uint8Array>} */
  const files = {};
  for (const path of paths) files[path] = readFileSync(join(distDir, path));

  const decoder = new TextDecoder();
  const errors = validateBuild({
    manifest: JSON.parse(decoder.decode(files['manifest.json'])),
    files: paths,
    packageVersion,
    sources: Object.fromEntries(
      paths.filter((p) => p.endsWith('.js')).map((p) => [p, decoder.decode(files[p])]),
    ),
  });
  if (errors.length > 0) {
    throw new Error(
      `Refusing to package an invalid build:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }

  const zip = createZip(files);
  const name = `sitecheck-${packageVersion}.zip`;
  const hash = sha256(zip);
  mkdirSync(outDir, { recursive: true });
  const zipPath = join(outDir, name);
  const checksumPath = `${zipPath}.sha256`;
  writeFileSync(zipPath, zip);
  // The format `sha256sum --check` reads.
  writeFileSync(checksumPath, `${hash}  ${name}\n`);
  return { zipPath, checksumPath, hash, fileCount: paths.filter(isPackaged).length };
}

function main() {
  const root = resolve(import.meta.dirname, '..');
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  try {
    const result = packageBuild({
      distDir: join(root, 'dist'),
      outDir: join(root, 'release'),
      packageVersion: version,
    });
    console.log(
      `Packaged ${String(result.fileCount)} files into ${relative(root, result.zipPath)}\nSHA-256 ${result.hash}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
