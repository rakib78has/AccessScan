import type { Finding } from '../shared/types/scan';

/** Bump when the exported JSON shape changes incompatibly. */
export const REPORT_SCHEMA_VERSION = 1;

export const REPORT_DISCLAIMER =
  'Automated checks find only some accessibility problems. A report without violations does not ' +
  'mean the page meets WCAG; manual testing with a keyboard and a screen reader is still needed.';

export interface ReportContext {
  /** The SiteCheck version that produced the report. */
  toolVersion: string;
  generatedAt: Date;
}

export interface JsonReport {
  reportSchemaVersion: typeof REPORT_SCHEMA_VERSION;
  tool: { name: 'SiteCheck'; version: string };
  generatedAt: string;
  disclaimer: string;
  page: { url: string; scannedAt: string };
  engines: { accessibility: string; seo: string };
  summary: { violations: number; needsReview: number; passedRules: number };
  findings: Finding[];
}
