import type { AxeResults, ImpactValue, NodeResult, Result } from 'axe-core';
import { isSafeHelpUrl } from '../../messaging/guards';
import { IMPACTS, SCAN_SCHEMA_VERSION } from '../../shared/types/scan';
import type { AffectedNode, Finding, Impact, Outcome, ScanResult } from '../../shared/types/scan';

/*
 * Converts raw axe-core output into SiteCheck's schema. Runs inside the
 * scanned page, so the large raw payload never crosses the message boundary.
 * Limits keep one pathological page from filling chrome.storage.session.
 */

export const MAX_NODES_PER_FINDING = 50;
export const MAX_HTML_LENGTH = 300;
export const MAX_SUMMARY_LENGTH = 500;

type AxeInput = Pick<AxeResults, 'violations' | 'incomplete' | 'passes' | 'testEngine'>;

export interface NormalizeContext {
  pageUrl: string;
  scannedAt: string;
  durationMs: number;
}

export function normalizeAxeResults(results: AxeInput, context: NormalizeContext): ScanResult {
  const findings = [
    ...results.violations.map((rule) => toFinding(rule, 'violation')),
    ...results.incomplete.map((rule) => toFinding(rule, 'needs-review')),
  ];

  return {
    schemaVersion: SCAN_SCHEMA_VERSION,
    pageUrl: context.pageUrl,
    scannedAt: context.scannedAt,
    durationMs: Math.max(0, Math.round(context.durationMs)),
    engine: { name: 'axe-core', version: results.testEngine.version },
    findings: sortFindings(findings),
    passedRuleCount: results.passes.length,
  };
}

function toFinding(rule: Result, outcome: Outcome): Finding {
  return {
    source: 'axe',
    ruleId: rule.id,
    outcome,
    impact: toImpact(rule.impact),
    title: rule.help,
    description: rule.description,
    helpUrl: isSafeHelpUrl(rule.helpUrl) ? rule.helpUrl : null,
    wcagTags: rule.tags.filter((tag) => /^wcag\d/.test(tag)),
    nodeCount: rule.nodes.length,
    nodes: rule.nodes.slice(0, MAX_NODES_PER_FINDING).map(toAffectedNode),
  };
}

function toImpact(impact: ImpactValue | undefined): Impact | null {
  return (IMPACTS as readonly unknown[]).includes(impact) ? (impact as Impact) : null;
}

function toAffectedNode(node: NodeResult): AffectedNode {
  return {
    target: formatTarget(node.target),
    html: truncate(node.html, MAX_HTML_LENGTH),
    failureSummary: truncate(node.failureSummary ?? '', MAX_SUMMARY_LENGTH),
  };
}

/** axe nests selectors per iframe and per shadow root; flatten them into one readable path. */
export function formatTarget(target: NodeResult['target']): string {
  return (target as unknown[]).flat(Infinity).map(String).join(' >>> ');
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

const IMPACT_RANK: Record<Impact, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

/** Violations before items needing review, then by severity, then by rule id for stable output. */
function compareFindings(a: Finding, b: Finding): number {
  if (a.outcome !== b.outcome) return a.outcome === 'violation' ? -1 : 1;
  const rank = (f: Finding) => (f.impact ? IMPACT_RANK[f.impact] : IMPACTS.length);
  return rank(a) - rank(b) || a.ruleId.localeCompare(b.ruleId);
}

export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(compareFindings);
}
