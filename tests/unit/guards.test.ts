import { describe, expect, it } from 'vitest';
import { isSafeHelpUrl, isScanResult, isWorkerMessage } from '../../src/messaging/guards';
import { makeFinding, makeScanResult } from '../helpers/scan-data';

describe('SC-UNIT-005 isWorkerMessage', () => {
  it('accepts a well-formed scan request', () => {
    expect(isWorkerMessage({ type: 'scan:start', tabId: 7 })).toBe(true);
  });

  it.each([
    null,
    undefined,
    'scan:start',
    [],
    {},
    { type: 'scan:stop', tabId: 7 },
    { type: 'scan:start' },
    { type: 'scan:start', tabId: '7' },
    { type: 'scan:start', tabId: -1 },
    { type: 'scan:start', tabId: 1.5 },
    { type: 'scan:start', tabId: Number.NaN },
  ])('rejects %j', (message) => {
    expect(isWorkerMessage(message)).toBe(false);
  });
});

describe('SC-UNIT-005 isSafeHelpUrl', () => {
  it.each([null, 'https://dequeuniversity.com/rules/axe/4.14/image-alt'])('accepts %j', (url) => {
    expect(isSafeHelpUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'http://example.com/',
    'data:text/html,<script>alert(1)</script>',
    'not a url',
    42,
    undefined,
  ])('rejects %j', (url) => {
    expect(isSafeHelpUrl(url)).toBe(false);
  });
});

describe('SC-UNIT-005 isScanResult', () => {
  it('accepts a complete result', () => {
    expect(isScanResult(makeScanResult())).toBe(true);
  });

  it('accepts findings with no impact and no help URL', () => {
    const finding = makeFinding({ impact: null, helpUrl: null, outcome: 'needs-review' });
    expect(isScanResult(makeScanResult({ findings: [finding] }))).toBe(true);
  });

  it.each([
    ['a different schema version', { schemaVersion: 2 }],
    ['a negative duration', { durationMs: -1 }],
    ['a different engine', { engine: { name: 'other', version: '1' } }],
    ['findings that are not an array', { findings: {} }],
    [
      'a finding with an unknown outcome',
      { findings: [makeFinding({ outcome: 'pass' as never })] },
    ],
    ['a finding with an unknown impact', { findings: [makeFinding({ impact: 'huge' as never })] }],
    ['a javascript: help URL', { findings: [makeFinding({ helpUrl: 'javascript:alert(1)' })] }],
    ['a node with no html', { findings: [makeFinding({ nodes: [{ target: 'a' } as never] })] }],
    ['a finding from an unknown source', { findings: [makeFinding({ source: 'x' as never })] }],
  ])('rejects %s', (_label, overrides) => {
    expect(isScanResult({ ...makeScanResult(), ...overrides })).toBe(false);
  });

  it.each([null, undefined, 'result', [], 0])('rejects %j', (value) => {
    expect(isScanResult(value)).toBe(false);
  });

  it('accepts SEO findings, including page-wide ones with no elements', () => {
    const seo = makeFinding({ source: 'seo', wcagTags: [], nodeCount: 0, nodes: [] });
    expect(isScanResult(makeScanResult({ findings: [seo] }))).toBe(true);
  });
});
