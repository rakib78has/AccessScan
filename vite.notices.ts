import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Emits a notices file listing every npm package actually bundled into the
 * build, with its licence text and where its source can be obtained.
 *
 * Licences require this: MIT asks for the licence to travel with the code,
 * and MPL-2.0 (axe-core) also asks that recipients be told where to get the
 * source. Deriving the list from the bundled modules, rather than from
 * package.json, keeps it exact as dependencies change.
 */

const LICENSE_FILES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENSE-3RD-PARTY.txt'];

interface PackageInfo {
  name: string;
  version: string;
  license: string;
  repository: string;
  texts: string[];
}

/** `…/node_modules/@scope/name/…` or `…/node_modules/name/…` → package directory. */
export function packageDir(moduleId: string): string | null {
  const path = moduleId.replaceAll('\\', '/').replace(/^\0/, '').split('?')[0] ?? '';
  const match = /^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(path);
  return match?.[1] ?? null;
}

function readPackage(dir: string): PackageInfo {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
    license?: string;
    repository?: string | { url?: string };
  };
  const repository =
    typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository?.url ?? 'unknown');
  return {
    name: pkg.name,
    version: pkg.version,
    license: pkg.license ?? 'UNKNOWN',
    repository: repository.replace(/^git\+/, ''),
    texts: LICENSE_FILES.filter((f) => existsSync(join(dir, f))).map((f) =>
      readFileSync(join(dir, f), 'utf8').trim(),
    ),
  };
}

export function formatNotices(packages: PackageInfo[]): string {
  const header =
    'SiteCheck includes the following third-party software. Each is distributed unmodified\n' +
    'under its own licence, reproduced below; its source is available at the address given.\n';
  const sections = packages.map((p) =>
    [
      '='.repeat(78),
      `${p.name} ${p.version}`,
      `Licence: ${p.license}`,
      `Source: ${p.repository}`,
      '-'.repeat(78),
      ...(p.texts.length > 0 ? p.texts : ['(no licence file found in the package)']),
    ].join('\n'),
  );
  return `${header}\n${sections.join('\n\n')}\n`;
}

export function noticesPlugin(fileName: string): Plugin {
  return {
    name: 'sitecheck-notices',
    generateBundle() {
      const dirs = new Set<string>();
      for (const id of this.getModuleIds()) {
        const dir = packageDir(id);
        if (dir && existsSync(join(dir, 'package.json'))) dirs.add(dir);
      }
      const packages = [...dirs].map(readPackage).sort((a, b) => a.name.localeCompare(b.name));
      if (packages.some((p) => p.texts.length === 0)) {
        this.warn('A bundled package has no licence file; check THIRD_PARTY_NOTICES.');
      }
      this.emitFile({ type: 'asset', fileName, source: formatNotices(packages) });
    },
  };
}
