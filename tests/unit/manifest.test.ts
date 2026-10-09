import { describe, expect, it } from 'vitest';
import { buildManifest } from '../../manifest.config.ts';
import { ALLOWED_PERMISSIONS } from '../../scripts/validate-build.mjs';

describe('SC-UNIT-001 buildManifest', () => {
  const manifest = buildManifest('1.2.3');

  it('produces a Manifest V3 manifest carrying the given version', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe('1.2.3');
  });

  it('requests no host access, so pages are read only after a user click', () => {
    expect(manifest).not.toHaveProperty('host_permissions');
    expect(manifest).not.toHaveProperty('optional_host_permissions');
    expect(manifest).not.toHaveProperty('content_scripts');
  });

  it('requests exactly the allowlisted permissions', () => {
    expect([...(manifest.permissions ?? [])].sort()).toEqual([...ALLOWED_PERMISSIONS].sort());
  });

  it('adds host access to the fixture server only in the end-to-end build', () => {
    expect(buildManifest('1.2.3', { e2eFixtureAccess: true }).host_permissions).toEqual([
      'http://127.0.0.1/*',
    ]);
  });

  it('registers the service worker as an ES module at a stable path', () => {
    expect(manifest.background).toEqual({ service_worker: 'service-worker.js', type: 'module' });
  });
});
