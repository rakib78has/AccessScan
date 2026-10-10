import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER,
  countByOutcome,
  countBySeverity,
  filterFindings,
  type SeverityBucket,
} from '../../src/popup/filters';
import { makeFinding } from '../helpers/scan-data';

const findings = [
  makeFinding({ ruleId: 'image-alt', impact: 'critical' }),
  makeFinding({ ruleId: 'label', impact: 'critical' }),
  makeFinding({ ruleId: 'region', impact: 'moderate' }),
  makeFinding({ ruleId: 'odd', impact: null }),
  makeFinding({ ruleId: 'color-contrast', outcome: 'needs-review', impact: 'serious' }),
];

const ids = (list: { ruleId: string }[]) => list.map((f) => f.ruleId);

describe('SC-UNIT-009 finding filters', () => {
  it('shows every violation by default, including unrated ones', () => {
    expect(ids(filterFindings(findings, DEFAULT_FILTER))).toEqual([
      'image-alt',
      'label',
      'region',
      'odd',
    ]);
  });

  it('switches to items needing review', () => {
    expect(ids(filterFindings(findings, { ...DEFAULT_FILTER, outcome: 'needs-review' }))).toEqual([
      'color-contrast',
    ]);
  });

  it('keeps only the selected severities', () => {
    const severities = new Set<SeverityBucket>(['moderate', 'unknown']);
    expect(ids(filterFindings(findings, { outcome: 'violation', severities }))).toEqual([
      'region',
      'odd',
    ]);
  });

  it('shows nothing when no severity is selected', () => {
    expect(filterFindings(findings, { outcome: 'violation', severities: new Set() })).toEqual([]);
  });

  it('counts by outcome and by severity within an outcome', () => {
    expect(countByOutcome(findings)).toEqual({ violation: 4, 'needs-review': 1 });
    expect(countBySeverity(findings, 'violation')).toEqual({
      critical: 2,
      serious: 0,
      moderate: 1,
      minor: 0,
      unknown: 1,
    });
    expect(countBySeverity(findings, 'needs-review').serious).toBe(1);
  });
});
