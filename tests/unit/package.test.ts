import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { unzipSync } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';
import { buildManifest } from '../../manifest.config.ts';
import { createZip, packageBuild, sha256 } from '../../scripts/package.mjs';

const encode = (text: string) => new TextEncoder().encode(text);
const VERSION = '1.2.3';

let tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sitecheck-package-'));
  tempDirs.push(dir);
  return dir;
}

/** Writes a minimal build that passes validation, with optional overrides. */
function writeDist(overrides: { manifest?: object; extra?: Record<string, string> } = {}): string {
  const dist = tempDir();
  const files: Record<string, string> = {
    'manifest.json': JSON.stringify(overrides.manifest ?? buildManifest(VERSION)),
    'popup/index.html': '<!doctype html>',
    'service-worker.js': 'chrome.runtime.onInstalled.addListener(() => {});',
    'service-worker.js.map': '{}',
    'scanner.js': '(function () {})();',
    'THIRD_PARTY_NOTICES.txt': 'notices',
    'THIRD_PARTY_NOTICES_SCANNER.txt': 'notices',
    'icons/icon-16.png': 'png',
    'icons/icon-32.png': 'png',
    'icons/icon-48.png': 'png',
    'icons/icon-128.png': 'png',
    ...overrides.extra,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dist, path)), { recursive: true });
    writeFileSync(join(dist, path), content);
  }
  return dist;
}

describe('SC-UNIT-016 createZip', () => {
  const files = { 'b.js': encode('b'), 'a/x.js': encode('x'), 'b.js.map': encode('{}') };

  it('round-trips file contents and leaves out source maps', () => {
    const unzipped = unzipSync(createZip(files));
    expect(Object.keys(unzipped).sort()).toEqual(['a/x.js', 'b.js']);
    expect(new TextDecoder().decode(unzipped['b.js'])).toBe('b');
  });

  it('is reproducible: the same input always gives the same bytes', () => {
    const reordered = {
      'b.js.map': files['b.js.map'],
      'a/x.js': files['a/x.js'],
      'b.js': files['b.js'],
    };
    expect(sha256(createZip(files))).toBe(sha256(createZip(reordered)));
  });
});

describe('SC-UNIT-016 packageBuild', () => {
  it('writes the zip and a checksum file sha256sum can verify', () => {
    const out = tempDir();
    const result = packageBuild({ distDir: writeDist(), outDir: out, packageVersion: VERSION });

    expect(result.zipPath).toBe(join(out, 'sitecheck-1.2.3.zip'));
    expect(result.fileCount).toBe(10);
    const zip = readFileSync(result.zipPath);
    expect(readFileSync(result.checksumPath, 'utf8')).toBe(`${sha256(zip)}  sitecheck-1.2.3.zip\n`);
    expect(Object.keys(unzipSync(zip))).not.toContain('service-worker.js.map');
  });

  it('refuses to package the end-to-end build, and writes nothing', () => {
    const out = join(tempDir(), 'release');
    const dist = writeDist({ manifest: buildManifest(VERSION, { e2eFixtureAccess: true }) });
    expect(() => packageBuild({ distDir: dist, outDir: out, packageVersion: VERSION })).toThrow(
      /host_permissions is not allowed/,
    );
    expect(existsSync(out)).toBe(false);
  });

  it('refuses a build whose own code makes network calls', () => {
    const dist = writeDist({ extra: { 'service-worker.js': 'fetch("https://evil.example")' } });
    expect(() =>
      packageBuild({ distDir: dist, outDir: tempDir(), packageVersion: VERSION }),
    ).toThrow(/service-worker\.js must not contain fetch\(\)/);
  });

  it('refuses a version mismatch with package.json', () => {
    expect(() =>
      packageBuild({ distDir: writeDist(), outDir: tempDir(), packageVersion: '9.9.9' }),
    ).toThrow(/does not match package\.json/);
  });

  it('explains when there is no build yet', () => {
    expect(() =>
      packageBuild({ distDir: tempDir(), outDir: tempDir(), packageVersion: VERSION }),
    ).toThrow(/Run `npm run build` first/);
  });
});
