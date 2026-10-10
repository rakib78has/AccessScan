import type { ScanResult } from '../shared/types/scan';
import { sortFindings } from './accessibility/normalize';
import type { SeoCheckResult } from './seo/seo-rules';

/** Merges SEO findings into the accessibility result, keeping the shared severity order. */
export function withSeoResults(result: ScanResult, seo: SeoCheckResult): ScanResult {
  return {
    ...result,
    findings: sortFindings([...result.findings, ...seo.findings]),
    passedRuleCount: result.passedRuleCount + seo.passedRuleCount,
  };
}
