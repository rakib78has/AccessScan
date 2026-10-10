import { describe, expect, it } from 'vitest';
import { buildJsonReport, toJson } from '../../src/reports/exporters/json';
import { REPORT_DISCLAIMER } from '../../src/reports/report-types';
import { makeFinding, makeScanResult } from '../helpers/scan-data';

const context = { toolVersion: '0.1.0', generatedAt: new Date('2026-10-10T12:34:56Z') };

describe('SC-UNIT-014 JSON export', () => {
  const result = makeScanResult({
    findings: [
      makeFinding({ ruleId: 'image-alt' }),
      makeFinding({ ruleId: 'label' }),
      makeFinding({ ruleId: 'seo-noindex', source: 'seo', outcome: 'needs-review' }),
    ],
    passedRuleCount: 37,
  });

  it('describes the tool, page, engines and totals', () => {
    const report = buildJsonReport(result, context);
    expect(report).toMatchObject({
      reportSchemaVersion: 1,
      tool: { name: 'SiteCheck', version: '0.1.0' },
      generatedAt: '2026-10-10T12:34:56.000Z',
      page: { url: 'https://example.com/page', scannedAt: '2026-10-10T12:00:00.000Z' },
      engines: { accessibility: 'axe-core 4.14.0', seo: 'SiteCheck 0.1.0' },
      summary: { violations: 2, needsReview: 1, passedRules: 37 },
    });
  });

  it('carries the automated-testing disclaimer', () => {
    expect(buildJsonReport(result, context).disclaimer).toBe(REPORT_DISCLAIMER);
  });

  it('round-trips every finding unchanged', () => {
    const parsed = JSON.parse(toJson(result, context)) as { findings: unknown };
    expect(parsed.findings).toEqual(result.findings);
  });

  it('keeps hostile page content as plain string data', () => {
    const hostile = '</script><script>alert(1)</script>"\u2028';
    const report = toJson(
      makeScanResult({
        findings: [
          makeFinding({ nodes: [{ target: hostile, html: hostile, failureSummary: '' }] }),
        ],
      }),
      context,
    );
    const parsed = JSON.parse(report) as { findings: { nodes: { html: string }[] }[] };
    expect(parsed.findings[0]?.nodes[0]?.html).toBe(hostile);
  });

  it('is pretty-printed and ends with a newline', () => {
    const json = toJson(result, context);
    expect(json.endsWith('}\n')).toBe(true);
    expect(json).toContain('\n  "tool": {');
  });
});
