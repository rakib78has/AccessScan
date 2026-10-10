import {
  FINDING_SOURCES,
  IMPACTS,
  type Finding,
  type FindingSource,
  type Impact,
  type Outcome,
} from '../shared/types/scan';

/**
 * Severity buckets for filtering. `unknown` holds findings the engine gave no
 * impact, so they can be filtered like the rest instead of silently vanishing.
 */
export type SeverityBucket = Impact | 'unknown';
export const SEVERITY_BUCKETS: readonly SeverityBucket[] = [...IMPACTS, 'unknown'];

export interface FindingFilter {
  outcome: Outcome;
  severities: ReadonlySet<SeverityBucket>;
  sources: ReadonlySet<FindingSource>;
}

export const DEFAULT_FILTER: FindingFilter = {
  outcome: 'violation',
  severities: new Set(SEVERITY_BUCKETS),
  sources: new Set(FINDING_SOURCES),
};

export function severityOf(finding: Finding): SeverityBucket {
  return finding.impact ?? 'unknown';
}

export function filterFindings(findings: readonly Finding[], filter: FindingFilter): Finding[] {
  return findings.filter(
    (f) =>
      f.outcome === filter.outcome &&
      filter.severities.has(severityOf(f)) &&
      filter.sources.has(f.source),
  );
}

/** Outcome totals ignore the other filters, so switching outcome never hides a count. */
export function countByOutcome(findings: readonly Finding[]): Record<Outcome, number> {
  const counts: Record<Outcome, number> = { violation: 0, 'needs-review': 0 };
  for (const f of findings) counts[f.outcome] += 1;
  return counts;
}

/**
 * Each facet counts with the other facets applied, so the number beside an
 * option is exactly how many findings ticking it would add to the list.
 */
export function countBySeverity(
  findings: readonly Finding[],
  filter: FindingFilter,
): Record<SeverityBucket, number> {
  const counts = Object.fromEntries(SEVERITY_BUCKETS.map((s) => [s, 0])) as Record<
    SeverityBucket,
    number
  >;
  for (const f of findings) {
    if (f.outcome === filter.outcome && filter.sources.has(f.source)) counts[severityOf(f)] += 1;
  }
  return counts;
}

export function countBySource(
  findings: readonly Finding[],
  filter: FindingFilter,
): Record<FindingSource, number> {
  const counts: Record<FindingSource, number> = { axe: 0, seo: 0 };
  for (const f of findings) {
    if (f.outcome === filter.outcome && filter.severities.has(severityOf(f))) counts[f.source] += 1;
  }
  return counts;
}

export const SEVERITY_LABELS: Record<SeverityBucket, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
  unknown: 'Unrated',
};

export const SOURCE_LABELS: Record<FindingSource, string> = {
  axe: 'Accessibility',
  seo: 'SEO',
};
