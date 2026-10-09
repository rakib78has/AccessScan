import { IMPACTS, SCAN_SCHEMA_VERSION } from '../shared/types/scan';
import type { AffectedNode, Finding, Impact, ScanResult } from '../shared/types/scan';
import type { WorkerMessage } from './contracts';

/*
 * Runtime checks for data crossing a trust boundary. TypeScript types vanish
 * at runtime, so anything arriving by message or from an injected script is
 * `unknown` until one of these guards accepts it.
 */

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isWorkerMessage(value: unknown): value is WorkerMessage {
  return isRecord(value) && value.type === 'scan:start' && isCount(value.tabId);
}

function isImpact(value: unknown): value is Impact | null {
  return value === null || (IMPACTS as readonly unknown[]).includes(value);
}

/** Only https links are ever rendered, so `javascript:` and similar can never reach an href. */
export function isSafeHelpUrl(value: unknown): value is string | null {
  if (value === null) return true;
  if (!isString(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isAffectedNode(value: unknown): value is AffectedNode {
  return (
    isRecord(value) &&
    isString(value.target) &&
    isString(value.html) &&
    isString(value.failureSummary)
  );
}

function isFinding(value: unknown): value is Finding {
  return (
    isRecord(value) &&
    value.source === 'axe' &&
    isString(value.ruleId) &&
    (value.outcome === 'violation' || value.outcome === 'needs-review') &&
    isImpact(value.impact) &&
    isString(value.title) &&
    isString(value.description) &&
    isSafeHelpUrl(value.helpUrl) &&
    isStringArray(value.wcagTags) &&
    isCount(value.nodeCount) &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isAffectedNode)
  );
}

export function isScanResult(value: unknown): value is ScanResult {
  return (
    isRecord(value) &&
    value.schemaVersion === SCAN_SCHEMA_VERSION &&
    isString(value.pageUrl) &&
    isString(value.scannedAt) &&
    isCount(value.durationMs) &&
    isRecord(value.engine) &&
    value.engine.name === 'axe-core' &&
    isString(value.engine.version) &&
    Array.isArray(value.findings) &&
    value.findings.every(isFinding) &&
    isCount(value.passedRuleCount)
  );
}
