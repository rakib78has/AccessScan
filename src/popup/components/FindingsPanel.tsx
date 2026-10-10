import { useState } from 'react';
import type { ScanResult } from '../../shared/types/scan';
import { DEFAULT_FILTER, filterFindings, type FindingFilter } from '../filters';
import { FindingFilters } from './FindingFilters';
import { FindingItem } from './FindingItem';

interface Props {
  result: ScanResult;
  onHighlight: (target: string) => void;
  highlightMessage: string | null;
}

export function FindingsPanel({ result, onHighlight, highlightMessage }: Props) {
  const [filter, setFilter] = useState<FindingFilter>(DEFAULT_FILTER);
  const visible = filterFindings(result.findings, filter);
  const hasAnyForOutcome = result.findings.some((f) => f.outcome === filter.outcome);

  return (
    <section aria-labelledby="findings-heading" className="flex flex-col gap-2">
      <h2 id="findings-heading" className="text-base font-semibold">
        Findings
      </h2>
      <FindingFilters findings={result.findings} filter={filter} onChange={setFilter} />

      {filter.outcome === 'needs-review' && hasAnyForOutcome && (
        <p className="text-xs text-slate-700 dark:text-slate-300">
          Automated checks could not decide these. Check each one yourself; they are not confirmed
          problems.
        </p>
      )}

      <div
        role="status"
        aria-live="polite"
        aria-label="Highlight status"
        className="text-xs"
        data-testid="highlight-status"
      >
        {highlightMessage}
      </div>

      {visible.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label="Findings">
          {visible.map((finding) => (
            <FindingItem
              key={`${finding.outcome}:${finding.ruleId}`}
              finding={finding}
              onHighlight={onHighlight}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm" data-testid="findings-empty">
          {!hasAnyForOutcome
            ? filter.outcome === 'violation'
              ? 'Automated checks found no violations. That is not proof the page is accessible.'
              : 'Nothing needs manual review from the automated checks.'
            : 'No findings match the selected filters.'}
        </p>
      )}
    </section>
  );
}
