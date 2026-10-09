import { describe, expect, it } from 'vitest';
import { isScanResult } from '../../src/messaging/guards';
import {
  MAX_HTML_LENGTH,
  MAX_NODES_PER_FINDING,
  MAX_SUMMARY_LENGTH,
  formatTarget,
  normalizeAxeResults,
  truncate,
} from '../../src/scanner/accessibility/normalize';
import { makeAxeNode, makeAxeRule } from '../helpers/scan-data';

const context = {
  pageUrl: 'https://example.com/',
  scannedAt: '2026-10-10T00:00:00.000Z',
  durationMs: 1234.6,
};
const engine = { name: 'axe-core', version: '4.14.0' };

function normalize(input: Partial<Parameters<typeof normalizeAxeResults>[0]>) {
  return normalizeAxeResults(
    { violations: [], incomplete: [], passes: [], testEngine: engine, ...input },
    context,
  );
}

describe('SC-UNIT-004 normalizeAxeResults', () => {
  it('produces a result the trust-boundary guard accepts', () => {
    const result = normalize({
      violations: [makeAxeRule()],
      incomplete: [makeAxeRule({ id: 'color-contrast', impact: null })],
    });
    expect(isScanResult(result)).toBe(true);
    expect(result.durationMs).toBe(1235);
    expect(result.engine.version).toBe('4.14.0');
  });

  it('keeps violations and incomplete checks apart', () => {
    const result = normalize({
      violations: [makeAxeRule({ id: 'image-alt' })],
      incomplete: [makeAxeRule({ id: 'color-contrast', impact: 'serious' })],
    });
    expect(result.findings.map((f) => [f.ruleId, f.outcome])).toEqual([
      ['image-alt', 'violation'],
      ['color-contrast', 'needs-review'],
    ]);
  });

  it('counts passed rules without keeping their details', () => {
    const result = normalize({ passes: [makeAxeRule({ id: 'a' }), makeAxeRule({ id: 'b' })] });
    expect(result.passedRuleCount).toBe(2);
    expect(result.findings).toEqual([]);
  });

  it('orders violations by severity, then rule id, before items needing review', () => {
    const result = normalize({
      violations: [
        makeAxeRule({ id: 'region', impact: 'moderate' }),
        makeAxeRule({ id: 'label', impact: 'critical' }),
        makeAxeRule({ id: 'image-alt', impact: 'critical' }),
        makeAxeRule({ id: 'odd', impact: null }),
      ],
      incomplete: [makeAxeRule({ id: 'color-contrast', impact: 'serious' })],
    });
    expect(result.findings.map((f) => f.ruleId)).toEqual([
      'image-alt',
      'label',
      'region',
      'odd',
      'color-contrast',
    ]);
  });

  it('maps a missing impact to null rather than inventing a severity', () => {
    const [finding] = normalize({ incomplete: [makeAxeRule({ impact: undefined })] }).findings;
    expect(finding?.impact).toBeNull();
  });

  it('keeps only WCAG tags', () => {
    const [finding] = normalize({ violations: [makeAxeRule()] }).findings;
    expect(finding?.wcagTags).toEqual(['wcag2a', 'wcag111']);
  });

  it('drops a help URL that is not https', () => {
    const [finding] = normalize({
      violations: [makeAxeRule({ helpUrl: 'javascript:alert(1)' })],
    }).findings;
    expect(finding?.helpUrl).toBeNull();
  });

  it('caps the stored nodes but reports the true count', () => {
    const nodes = Array.from({ length: MAX_NODES_PER_FINDING + 25 }, () => makeAxeNode());
    const [finding] = normalize({ violations: [makeAxeRule({ nodes })] }).findings;
    expect(finding?.nodeCount).toBe(MAX_NODES_PER_FINDING + 25);
    expect(finding?.nodes).toHaveLength(MAX_NODES_PER_FINDING);
  });

  it('truncates HTML snippets and failure summaries', () => {
    const node = makeAxeNode({
      html: `<p>${'x'.repeat(1000)}</p>`,
      failureSummary: 'y'.repeat(2000),
    });
    const [finding] = normalize({ violations: [makeAxeRule({ nodes: [node] })] }).findings;
    expect(finding?.nodes[0]?.html).toHaveLength(MAX_HTML_LENGTH);
    expect(finding?.nodes[0]?.failureSummary).toHaveLength(MAX_SUMMARY_LENGTH);
  });

  it('keeps page-provided markup as inert text', () => {
    const html = '<img src=x onerror="alert(1)">';
    const [finding] = normalize({
      violations: [makeAxeRule({ nodes: [makeAxeNode({ html })] })],
    }).findings;
    expect(finding?.nodes[0]?.html).toBe(html);
  });

  it('handles an empty failure summary', () => {
    const node = makeAxeNode({ failureSummary: undefined });
    const [finding] = normalize({ violations: [makeAxeRule({ nodes: [node] })] }).findings;
    expect(finding?.nodes[0]?.failureSummary).toBe('');
  });
});

describe('SC-UNIT-004 formatTarget', () => {
  it('joins iframe and shadow DOM selector paths', () => {
    expect(formatTarget(['#frame', ['#host', 'button']] as never)).toBe(
      '#frame >>> #host >>> button',
    );
    expect(formatTarget(['img'])).toBe('img');
  });
});

describe('SC-UNIT-004 truncate', () => {
  it('leaves short text alone and marks cut text with an ellipsis', () => {
    expect(truncate('abc', 3)).toBe('abc');
    expect(truncate('abcdef', 4)).toBe('abc…');
  });
});
