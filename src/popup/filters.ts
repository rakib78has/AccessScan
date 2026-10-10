import { IMPACTS, type Finding, type Impact, type Outcome } from '../shared/types/scan';

/**
 * Severity buckets for filtering. `unknown` holds findings the engine gave no
 * impact, so they can be filtered like the rest instead of silently vanishing.
 */
export type SeverityBucket = Impact | 'unknown';
export const SEVERITY_BUCKETS: readonly SeverityBucket[] = [...IMPACTS, 'unknown'];

export interface FindingFilter {
  outcome: Outcome;
  severities: ReadonlySet<SeverityBucket>;
}

export const DEFAULT_FILTER: FindingFilter = {
  outcome: 'violation',
  severities: new Set(SEVERITY_BUCKETS),
};

export function severityOf(finding: Finding): SeverityBucket {
  return finding.impact ?? 'unknown';
}

export function filterFindings(findings: readonly Finding[], filter: FindingFilter): Finding[] {
  return findings.filter(
    (f) => f.outcome === filter.outcome && filter.severities.has(severityOf(f)),
  );
}

export function countByOutcome(findings: readonly Finding[]): Record<Outcome, number> {
  const counts: Record<Outcome, number> = { violation: 0, 'needs-review': 0 };
  for (const f of findings) counts[f.outcome] += 1;
  return counts;
}

/** Counts per severity within one outcome, so the checkbox labels match what the list shows. */
export function countBySeverity(
  findings: readonly Finding[],
  outcome: Outcome,
): Record<SeverityBucket, number> {
  const counts = Object.fromEntries(SEVERITY_BUCKETS.map((s) => [s, 0])) as Record<
    SeverityBucket,
    number
  >;
  for (const f of findings) if (f.outcome === outcome) counts[severityOf(f)] += 1;
  return counts;
}

export const SEVERITY_LABELS: Record<SeverityBucket, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
  unknown: 'Unrated',
};
