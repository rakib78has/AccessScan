import type { NodeResult, Result } from 'axe-core';
import type { Finding, ScanResult } from '../../src/shared/types/scan';

/** Builders for test data. Each returns a valid object; tests override what they care about. */

export function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    source: 'axe',
    ruleId: 'image-alt',
    outcome: 'violation',
    impact: 'critical',
    title: 'Images must have alternative text',
    description: 'Ensures <img> elements have alternative text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/image-alt',
    wcagTags: ['wcag2a', 'wcag111'],
    nodeCount: 1,
    nodes: [{ target: 'img', html: '<img src="a.png">', failureSummary: 'Fix this' }],
    ...overrides,
  };
}

export function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: 1,
    pageUrl: 'https://example.com/page',
    scannedAt: '2026-10-10T12:00:00.000Z',
    durationMs: 1200,
    engine: { name: 'axe-core', version: '4.14.0' },
    findings: [makeFinding()],
    passedRuleCount: 40,
    ...overrides,
  };
}

export function makeAxeNode(overrides: Partial<NodeResult> = {}): NodeResult {
  return {
    html: '<img src="a.png">',
    target: ['img'],
    failureSummary: 'Fix any of the following: Element does not have an alt attribute',
    impact: 'critical',
    any: [],
    all: [],
    none: [],
    ...overrides,
  };
}

export function makeAxeRule(overrides: Partial<Result> = {}): Result {
  return {
    id: 'image-alt',
    impact: 'critical',
    tags: ['cat.text-alternatives', 'wcag2a', 'wcag111', 'section508', 'EN-301-549'],
    description: 'Ensures <img> elements have alternative text',
    help: 'Images must have alternative text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/image-alt?application=axeAPI',
    nodes: [makeAxeNode()],
    ...overrides,
  };
}
