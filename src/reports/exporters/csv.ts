import type { Finding, ScanResult } from '../../shared/types/scan';
import { REPORT_DISCLAIMER, type ReportContext } from '../report-types';

/*
 * CSV export, one row per affected element, or one row for a finding that
 * concerns the whole page.
 *
 * Spreadsheets execute cells that look like formulas, and most cells here
 * carry text from the scanned page. Following OWASP's CSV injection guidance,
 * any cell starting with = + - @ tab or carriage return gets a leading
 * apostrophe, which spreadsheets display as text. Every field is quoted
 * (RFC 4180), rows end in CRLF, and a byte-order mark tells Excel the file
 * is UTF-8.
 */

const BOM = '\uFEFF';
const EOL = '\r\n';
const FORMULA_START = /^[=+\-@\t\r]/;

export const CSV_COLUMNS = [
  'Category',
  'Outcome',
  'Severity',
  'Rule',
  'Title',
  'Description',
  'WCAG',
  'Element',
  'HTML',
  'Failure summary',
  'Help URL',
  'Page URL',
  'Scanned at',
] as const;

/** Neutralizes formulas, then quotes the field. Exported for direct testing. */
export function csvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

const CATEGORY: Record<Finding['source'], string> = { axe: 'Accessibility', seo: 'SEO' };
const OUTCOME: Record<Finding['outcome'], string> = {
  violation: 'Violation',
  'needs-review': 'Needs review',
};

function rowsFor(finding: Finding, result: ScanResult): string[][] {
  const shared = [
    CATEGORY[finding.source],
    OUTCOME[finding.outcome],
    finding.impact ?? 'unrated',
    finding.ruleId,
    finding.title,
    finding.description,
    finding.wcagTags.join(' '),
  ];
  const tail = [finding.helpUrl ?? '', result.pageUrl, result.scannedAt];

  if (finding.nodes.length === 0) return [[...shared, 'Whole page', '', '', ...tail]];
  return finding.nodes.map((node) => [
    ...shared,
    node.target,
    node.html,
    node.failureSummary,
    ...tail,
  ]);
}

export function toCsv(result: ScanResult, context: ReportContext): string {
  const rows: string[][] = [[...CSV_COLUMNS]];
  for (const finding of result.findings) rows.push(...rowsFor(finding, result));

  const lines = rows.map((row) => row.map(csvCell).join(','));
  // A trailing note keeps the disclaimer with the data wherever the file travels.
  lines.push('', csvCell(`SiteCheck ${context.toolVersion}. ${REPORT_DISCLAIMER}`));
  return BOM + lines.join(EOL) + EOL;
}
