import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER,
  countByOutcome,
  countBySeverity,
  countBySource,
  filterFindings,
  type FindingFilter,
  type SeverityBucket,
} from '../../src/popup/filters';
import type { FindingSource } from '../../src/shared/types/scan';
import { makeFinding } from '../helpers/scan-data';

const findings = [
  makeFinding({ ruleId: 'image-alt', impact: 'critical' }),
  makeFinding({ ruleId: 'label', impact: 'critical' }),
  makeFinding({ ruleId: 'region', impact: 'moderate' }),
  makeFinding({ ruleId: 'odd', impact: null }),
  makeFinding({ ruleId: 'seo-viewport-missing', source: 'seo', impact: 'moderate' }),
  makeFinding({ ruleId: 'color-contrast', outcome: 'needs-review', impact: 'serious' }),
  makeFinding({ ruleId: 'seo-noindex', source: 'seo', outcome: 'needs-review', impact: 'serious' }),
];

const ids = (list: { ruleId: string }[]) => list.map((f) => f.ruleId);

function filter(overrides: Partial<FindingFilter>): FindingFilter {
  return { ...DEFAULT_FILTER, ...overrides };
}

describe('SC-UNIT-009 finding filters', () => {
  it('shows every violation by default, from both categories, including unrated ones', () => {
    expect(ids(filterFindings(findings, DEFAULT_FILTER))).toEqual([
      'image-alt',
      'label',
      'region',
      'odd',
      'seo-viewport-missing',
    ]);
  });

  it('switches to items needing review', () => {
    expect(ids(filterFindings(findings, filter({ outcome: 'needs-review' })))).toEqual([
      'color-contrast',
      'seo-noindex',
    ]);
  });

  it('keeps only the selected severities', () => {
    const severities = new Set<SeverityBucket>(['moderate', 'unknown']);
    expect(ids(filterFindings(findings, filter({ severities })))).toEqual([
      'region',
      'odd',
      'seo-viewport-missing',
    ]);
  });

  it('keeps only the selected categories', () => {
    const sources = new Set<FindingSource>(['seo']);
    expect(ids(filterFindings(findings, filter({ sources })))).toEqual(['seo-viewport-missing']);
  });

  it('shows nothing when a whole facet is cleared', () => {
    expect(filterFindings(findings, filter({ severities: new Set() }))).toEqual([]);
    expect(filterFindings(findings, filter({ sources: new Set() }))).toEqual([]);
  });

  it('counts outcomes regardless of the other filters', () => {
    expect(countByOutcome(findings)).toEqual({ violation: 5, 'needs-review': 2 });
  });

  it('counts each severity with the category filter applied', () => {
    expect(countBySeverity(findings, DEFAULT_FILTER)).toEqual({
      critical: 2,
      serious: 0,
      moderate: 2,
      minor: 0,
      unknown: 1,
    });
    expect(countBySeverity(findings, filter({ sources: new Set(['axe']) })).moderate).toBe(1);
  });

  it('counts each category with the severity filter applied', () => {
    expect(countBySource(findings, DEFAULT_FILTER)).toEqual({ axe: 4, seo: 1 });
    expect(countBySource(findings, filter({ severities: new Set(['critical']) }))).toEqual({
      axe: 2,
      seo: 0,
    });
  });
});
