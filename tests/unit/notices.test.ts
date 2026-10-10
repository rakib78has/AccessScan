import { describe, expect, it } from 'vitest';
import { formatNotices, packageDir } from '../../vite.notices.ts';

// Built from its code point so no escaping can turn it into something else.
const BACKSLASH = String.fromCharCode(92);

describe('SC-UNIT-018 third-party notices', () => {
  it.each([
    ['/repo/node_modules/react/index.js', '/repo/node_modules/react'],
    ['/repo/node_modules/@scope/pkg/dist/a.js', '/repo/node_modules/@scope/pkg'],
    [
      ['C:', 'repo', 'node_modules', 'axe-core', 'axe.js'].join(BACKSLASH),
      'C:/repo/node_modules/axe-core',
    ],
    ['/repo/node_modules/a/node_modules/b/x.js', '/repo/node_modules/a/node_modules/b'],
    ['\0/repo/node_modules/react/jsx-runtime.js?commonjs-proxy', '/repo/node_modules/react'],
  ])('finds the package directory of %s', (id, dir) => {
    expect(packageDir(id)).toBe(dir);
  });

  it.each(['/repo/src/popup/App.tsx', '\0vite/preload-helper'])(
    'ignores the project’s own module %s',
    (id) => {
      expect(packageDir(id)).toBeNull();
    },
  );

  it('lists each package with its licence, source and full licence text', () => {
    const text = formatNotices([
      {
        name: 'axe-core',
        version: '4.14.0',
        license: 'MPL-2.0',
        repository: 'https://github.com/dequelabs/axe-core.git',
        texts: ['Mozilla Public License Version 2.0'],
      },
    ]);
    expect(text).toContain(
      'axe-core 4.14.0\nLicence: MPL-2.0\nSource: https://github.com/dequelabs/axe-core.git',
    );
    expect(text).toContain('Mozilla Public License Version 2.0');
  });
});
