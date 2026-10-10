import type { Finding, Outcome } from '../../shared/types/scan';
import {
  SEVERITY_BUCKETS,
  SEVERITY_LABELS,
  countByOutcome,
  countBySeverity,
  type FindingFilter,
  type SeverityBucket,
} from '../filters';

interface Props {
  findings: readonly Finding[];
  filter: FindingFilter;
  onChange: (filter: FindingFilter) => void;
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  violation: 'Violations',
  'needs-review': 'Needs review',
};

export function FindingFilters({ findings, filter, onChange }: Props) {
  const outcomeCounts = countByOutcome(findings);
  const severityCounts = countBySeverity(findings, filter.outcome);
  // Severities with nothing to show would only add noise.
  const visibleSeverities = SEVERITY_BUCKETS.filter((s) => severityCounts[s] > 0);

  const toggleSeverity = (severity: SeverityBucket, checked: boolean) => {
    const severities = new Set(filter.severities);
    if (checked) severities.add(severity);
    else severities.delete(severity);
    onChange({ ...filter, severities });
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <fieldset className="flex gap-4">
        <legend className="sr-only">Show</legend>
        {(['violation', 'needs-review'] as const).map((outcome) => (
          <label key={outcome} className="flex items-center gap-1">
            <input
              type="radio"
              name="outcome"
              value={outcome}
              checked={filter.outcome === outcome}
              onChange={() => {
                onChange({ ...filter, outcome });
              }}
            />
            {OUTCOME_LABELS[outcome]} ({outcomeCounts[outcome]})
          </label>
        ))}
      </fieldset>

      {visibleSeverities.length > 0 && (
        <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
          <legend className="mb-1 text-xs font-semibold">Severity</legend>
          {visibleSeverities.map((severity) => (
            <label key={severity} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={filter.severities.has(severity)}
                onChange={(event) => {
                  toggleSeverity(severity, event.currentTarget.checked);
                }}
              />
              {SEVERITY_LABELS[severity]} ({severityCounts[severity]})
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
