import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { checkRelease, extractReleaseNotes } from '../../scripts/release-check.mjs';

const CHANGELOG = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '## [0.2.0] - 2026-11-01',
  '',
  '### Added',
  '',
  '- Export.',
  '',
  '## [0.1.0] - 2026-10-10',
  '',
  '- First release.',
  '',
].join('\n');

describe('SC-UNIT-017 release check', () => {
  it('accepts a tag that matches package.json and has changelog notes', () => {
    expect(checkRelease({ tag: 'v0.2.0', packageVersion: '0.2.0', changelog: CHANGELOG })).toEqual(
      [],
    );
  });

  it.each(['0.2.0', 'v0.2', 'v0.2.0-rc.1', 'v0.2.0.1', 'release-0.2.0', ''])(
    'rejects the malformed tag %j',
    (tag) => {
      expect(checkRelease({ tag, packageVersion: '0.2.0', changelog: CHANGELOG })).toEqual([
        `tag "${tag}" must look like v1.2.3`,
      ]);
    },
  );

  it('rejects a tag that does not match package.json', () => {
    expect(checkRelease({ tag: 'v0.1.0', packageVersion: '0.2.0', changelog: CHANGELOG })).toEqual([
      'tag v0.1.0 does not match package.json version 0.2.0',
    ]);
  });

  it('rejects a release with no changelog section', () => {
    expect(checkRelease({ tag: 'v0.3.0', packageVersion: '0.3.0', changelog: CHANGELOG })).toEqual([
      'CHANGELOG.md has no non-empty "## [0.3.0]" section',
    ]);
  });

  it('rejects an empty changelog section', () => {
    const empty = '## [0.4.0]\n\n## [0.1.0]\n- x\n';
    expect(checkRelease({ tag: 'v0.4.0', packageVersion: '0.4.0', changelog: empty })).toEqual([
      'CHANGELOG.md has no non-empty "## [0.4.0]" section',
    ]);
  });
});

describe('SC-UNIT-017 extractReleaseNotes', () => {
  it('returns one version’s section, stopping at the next heading', () => {
    expect(extractReleaseNotes(CHANGELOG, '0.2.0')).toBe('### Added\n\n- Export.');
    expect(extractReleaseNotes(CHANGELOG, '0.1.0')).toBe('- First release.');
  });

  it('does not treat dots in the version as wildcards', () => {
    expect(extractReleaseNotes('## [0x2y0]\n- no\n', '0.2.0')).toBeNull();
  });

  it('reads Windows line endings', () => {
    expect(extractReleaseNotes('## [1.0.0]\r\n- yes\r\n', '1.0.0')).toBe('- yes');
  });
});

describe('SC-UNIT-017 release check command line', () => {
  const run = (...args: string[]) =>
    spawnSync(process.execPath, ['scripts/release-check.mjs', ...args], { encoding: 'utf8' });

  it('exits non-zero and explains why for an inconsistent tag', () => {
    const result = run('v99.0.0');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('tag v99.0.0 does not match package.json version');
  });

  it('exits non-zero for a malformed tag', () => {
    const result = run('latest');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must look like v1.2.3');
  });
});
