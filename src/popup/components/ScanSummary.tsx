import { IMPACTS, type Impact, type ScanResult } from '../../shared/types/scan';

interface Props {
  result: ScanResult;
}

const IMPACT_LABELS: Record<Impact, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
};

/** Counts only; the full findings list arrives in Milestone 3. */
export function ScanSummary({ result }: Props) {
  const violations = result.findings.filter((f) => f.outcome === 'violation');
  const needsReview = result.findings.filter((f) => f.outcome === 'needs-review');

  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-2">
      <h2 id="summary-heading" className="text-base font-semibold">
        Results
      </h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Violations" value={violations.length} testId="count-violations" />
        <Stat label="Need review" value={needsReview.length} testId="count-needs-review" />
        <Stat label="Rules passed" value={result.passedRuleCount} testId="count-passed" />
      </dl>
      {violations.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label="Violations by severity">
          {IMPACTS.map((impact) => {
            const count = violations.filter((f) => f.impact === impact).length;
            return count > 0 ? (
              <li key={impact} className="flex justify-between">
                <span>{IMPACT_LABELS[impact]}</span>
                <span>{count}</span>
              </li>
            ) : null;
          })}
        </ul>
      )}
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Checked with axe-core {result.engine.version} in {Math.round(result.durationMs / 100) / 10}{' '}
        s.
      </p>
    </section>
  );
}

function Stat({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="flex flex-col-reverse rounded-md bg-slate-100 p-2 dark:bg-slate-800">
      <dt className="text-xs text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="text-lg font-semibold" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
