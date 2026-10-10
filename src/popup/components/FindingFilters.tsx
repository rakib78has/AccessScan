import { FINDING_SOURCES, type Finding, type Outcome } from '../../shared/types/scan';
import {
  SEVERITY_BUCKETS,
  SEVERITY_LABELS,
  SOURCE_LABELS,
  countByOutcome,
  countBySeverity,
  countBySource,
  type FindingFilter,
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

      <CheckboxGroup
        legend="Category"
        options={FINDING_SOURCES}
        labels={SOURCE_LABELS}
        counts={countBySource(findings, filter)}
        selected={filter.sources}
        onChange={(sources) => {
          onChange({ ...filter, sources });
        }}
      />
      <CheckboxGroup
        legend="Severity"
        options={SEVERITY_BUCKETS}
        labels={SEVERITY_LABELS}
        counts={countBySeverity(findings, filter)}
        selected={filter.severities}
        onChange={(severities) => {
          onChange({ ...filter, severities });
        }}
      />
    </div>
  );
}

interface GroupProps<T extends string> {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  counts: Record<T, number>;
  selected: ReadonlySet<T>;
  onChange: (selected: ReadonlySet<T>) => void;
}

function CheckboxGroup<T extends string>({
  legend,
  options,
  labels,
  counts,
  selected,
  onChange,
}: GroupProps<T>) {
  // Options with nothing to show are noise, but an unticked one stays so it can be ticked again.
  const visible = options.filter((o) => counts[o] > 0 || !selected.has(o));
  if (visible.length === 0) return null;

  return (
    <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
      <legend className="mb-1 text-xs font-semibold">{legend}</legend>
      {visible.map((option) => (
        <label key={option} className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={selected.has(option)}
            onChange={(event) => {
              const next = new Set(selected);
              if (event.currentTarget.checked) next.add(option);
              else next.delete(option);
              onChange(next);
            }}
          />
          {labels[option]} ({counts[option]})
        </label>
      ))}
    </fieldset>
  );
}
