/**
 * The scan result schema shared by the scanner, service worker, storage and
 * popup. Bump SCAN_SCHEMA_VERSION when a stored shape changes incompatibly.
 */

export const SCAN_SCHEMA_VERSION = 1;

export const IMPACTS = ['critical', 'serious', 'moderate', 'minor'] as const;
export type Impact = (typeof IMPACTS)[number];

/**
 * `violation`: the engine is confident the rule fails.
 * `needs-review`: the engine could not decide (axe's "incomplete"), so a
 * person must check. These are not defects until someone confirms them.
 */
export type Outcome = 'violation' | 'needs-review';

export const FINDING_SOURCES = ['axe', 'seo'] as const;
export type FindingSource = (typeof FINDING_SOURCES)[number];

export interface AffectedNode {
  /** CSS selector path; frames and shadow roots are joined with " >>> ". */
  target: string;
  /** Truncated outerHTML of the element. Untrusted page content: render as text only. */
  html: string;
  /** The engine's explanation of why this element failed, truncated. */
  failureSummary: string;
}

export interface Finding {
  /** 'axe' for accessibility rules, 'seo' for SiteCheck's own SEO checks. */
  source: FindingSource;
  ruleId: string;
  outcome: Outcome;
  /** Null when the engine reports no impact, which axe does for some incomplete results. */
  impact: Impact | null;
  title: string;
  description: string;
  /** Always an https URL, or null. */
  helpUrl: string | null;
  /** WCAG tags such as "wcag2aa" or "wcag111"; may be empty for best-practice rules. */
  wcagTags: string[];
  /** Total affected elements, which may exceed `nodes.length` because nodes are capped. */
  nodeCount: number;
  nodes: AffectedNode[];
}

export interface ScanResult {
  schemaVersion: typeof SCAN_SCHEMA_VERSION;
  /** Origin and path only: query strings and fragments can carry tokens, so they are dropped. */
  pageUrl: string;
  scannedAt: string;
  durationMs: number;
  engine: { name: 'axe-core'; version: string };
  findings: Finding[];
  passedRuleCount: number;
}
