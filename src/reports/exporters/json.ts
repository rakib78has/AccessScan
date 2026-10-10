import type { ScanResult } from '../../shared/types/scan';
import {
  REPORT_DISCLAIMER,
  REPORT_SCHEMA_VERSION,
  type JsonReport,
  type ReportContext,
} from '../report-types';

export function buildJsonReport(result: ScanResult, context: ReportContext): JsonReport {
  let violations = 0;
  let needsReview = 0;
  for (const f of result.findings) {
    if (f.outcome === 'violation') violations += 1;
    else needsReview += 1;
  }

  return {
    reportSchemaVersion: REPORT_SCHEMA_VERSION,
    tool: { name: 'SiteCheck', version: context.toolVersion },
    generatedAt: context.generatedAt.toISOString(),
    disclaimer: REPORT_DISCLAIMER,
    page: { url: result.pageUrl, scannedAt: result.scannedAt },
    engines: {
      accessibility: `axe-core ${result.engine.version}`,
      seo: `SiteCheck ${context.toolVersion}`,
    },
    summary: { violations, needsReview, passedRules: result.passedRuleCount },
    findings: result.findings,
  };
}

/**
 * JSON.stringify escapes everything needed for a valid JSON document. Page
 * content inside stays data; nothing in the report is ever evaluated.
 */
export function toJson(result: ScanResult, context: ReportContext): string {
  return `${JSON.stringify(buildJsonReport(result, context), null, 2)}\n`;
}
