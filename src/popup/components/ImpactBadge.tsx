import { SEVERITY_LABELS, type SeverityBucket } from '../filters';

// Text and background pairs chosen to keep at least 4.5:1 contrast in both themes.
const STYLES: Record<SeverityBucket, string> = {
  critical: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100',
  serious: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100',
  moderate: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100',
  minor: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100',
  unknown: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
};

/** The severity is written out, never shown by colour alone. */
export function ImpactBadge({ severity }: { severity: SeverityBucket }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${STYLES[severity]}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
