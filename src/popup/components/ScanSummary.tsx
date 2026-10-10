import type { ScanResult } from '../../shared/types/scan';
import { countByOutcome } from '../filters';

interface Props {
  result: ScanResult;
}

export function ScanSummary({ result }: Props) {
  const counts = countByOutcome(result.findings);

  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-2">
      <h2 id="summary-heading" className="text-base font-semibold">
        Summary
      </h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Violations" value={counts.violation} testId="count-violations" />
        <Stat label="Need review" value={counts['needs-review']} testId="count-needs-review" />
        <Stat label="Rules passed" value={result.passedRuleCount} testId="count-passed" />
      </dl>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Accessibility checked with axe-core {result.engine.version}, SEO with SiteCheck&apos;s own
        rules, in {Math.round(result.durationMs / 100) / 10} s. Counts are rules, not elements.
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
