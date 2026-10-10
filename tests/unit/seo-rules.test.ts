// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isScanResult } from '../../src/messaging/guards';
import { withSeoResults } from '../../src/scanner/combine';
import { runSeoChecks, selectorFor } from '../../src/scanner/seo/seo-rules';
import { makeFinding, makeScanResult } from '../helpers/scan-data';

const PAGE = 'https://example.com/products/shoes?ref=ad';
const GOOD_HEAD = `
  <title>Running shoes for trail and road | Example</title>
  <meta name="description" content="Compare lightweight running shoes for trail and road, with sizing advice and free returns.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://example.com/products/shoes">`;

function check(head: string, url = PAGE) {
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><head>${head}</head><body><h1>Shoes</h1></body></html>`,
    'text/html',
  );
  return runSeoChecks(doc, url);
}

/** Replaces one line of the known-good head, to test each rule in isolation. */
function headWith(replace: string, withText: string): string {
  if (!GOOD_HEAD.includes(replace)) throw new Error(`fixture has no ${replace}`);
  return GOOD_HEAD.replace(replace, withText);
}

const rules = (head: string, url?: string) =>
  check(head, url).findings.map((f) => `${f.ruleId}:${f.outcome}`);

const TITLE = '<title>Running shoes for trail and road | Example</title>';
const DESCRIPTION =
  '<meta name="description" content="Compare lightweight running shoes for trail and road, with sizing advice and free returns.">';
const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1">';
const CANONICAL = '<link rel="canonical" href="https://example.com/products/shoes">';

describe('SC-UNIT-011 SEO checks: a well-formed page', () => {
  it('reports nothing and counts every applicable check as passed', () => {
    const result = check(GOOD_HEAD);
    expect(result.findings).toEqual([]);
    // 11 checks; none are skipped when every element is present.
    expect(result.passedRuleCount).toBe(11);
  });
});

describe('SC-UNIT-011 SEO checks: title', () => {
  it('reports a missing title as a violation, and skips the length check', () => {
    const result = check(headWith(TITLE, ''));
    expect(result.findings.map((f) => f.ruleId)).toEqual(['seo-title-missing']);
    expect(result.passedRuleCount).toBe(8); // title-multiple and title-length do not apply
  });

  it('treats a whitespace-only title as missing', () => {
    expect(rules(headWith(TITLE, '<title>  \n </title>'))).toEqual(['seo-title-missing:violation']);
  });

  it('ignores an SVG title, which names a graphic rather than the page', () => {
    const doc = new DOMParser().parseFromString(
      '<html><head></head><body><svg><title>Logo</title></svg></body></html>',
      'text/html',
    );
    expect(runSeoChecks(doc, PAGE).findings.map((f) => f.ruleId)).toContain('seo-title-missing');
  });

  it('flags a second title element', () => {
    expect(rules(GOOD_HEAD + '<title>Another title for the page</title>')).toEqual([
      'seo-title-multiple:violation',
    ]);
  });

  it.each([
    ['too short', '<title>Shoes</title>'],
    ['too long', `<title>${'Running shoes '.repeat(6)}</title>`],
  ])('asks for review of a title that is %s, never calling it a violation', (_l, title) => {
    expect(rules(headWith(TITLE, title))).toEqual(['seo-title-length:needs-review']);
  });

  it('measures the title after collapsing whitespace', () => {
    expect(rules(headWith(TITLE, '<title>  Shoes    for   trail   runners  </title>'))).toEqual([]);
  });
});

describe('SC-UNIT-011 SEO checks: meta description', () => {
  it('reports a missing description as a page-wide violation with the fix in its text', () => {
    const [finding] = check(headWith(DESCRIPTION, '')).findings;
    expect(finding?.ruleId).toBe('seo-meta-description-missing');
    expect(finding?.nodeCount).toBe(0);
    expect(finding?.description).toContain('<meta name="description"');
  });

  it('treats an empty description as missing, pointing at the element', () => {
    const [finding] = check(
      headWith(DESCRIPTION, '<meta name="description" content="  ">'),
    ).findings;
    expect(finding?.ruleId).toBe('seo-meta-description-missing');
    expect(finding?.nodes[0]?.target).toBe('html > head > meta:nth-of-type(1)');
  });

  it('matches the meta name case-insensitively', () => {
    expect(rules(headWith(DESCRIPTION, DESCRIPTION.replace('description', 'Description')))).toEqual(
      [],
    );
  });

  it('flags duplicate descriptions', () => {
    expect(rules(GOOD_HEAD + DESCRIPTION)).toEqual(['seo-meta-description-multiple:violation']);
  });

  it.each([
    ['short', 'Shoes.'],
    ['long', 'Running shoes. '.repeat(15)],
  ])('asks for review of a %s description', (_l, text) => {
    expect(rules(headWith(DESCRIPTION, `<meta name="description" content="${text}">`))).toEqual([
      'seo-meta-description-length:needs-review',
    ]);
  });
});

describe('SC-UNIT-011 SEO checks: viewport and indexing', () => {
  it('reports a missing viewport', () => {
    expect(rules(headWith(VIEWPORT, ''))).toEqual(['seo-viewport-missing:violation']);
  });

  it.each([
    '<meta name="robots" content="noindex, follow">',
    '<meta name="ROBOTS" content="NOINDEX">',
    '<meta name="googlebot" content="noindex">',
    '<meta name="robots" content="none">',
  ])('asks for review of %s, since blocking indexing can be intentional', (meta) => {
    expect(rules(GOOD_HEAD + meta)).toEqual(['seo-noindex:needs-review']);
  });

  it.each([
    '<meta name="robots" content="index, follow">',
    '<meta name="robots" content="noindexer">',
    '<meta name="description2" content="noindex">',
  ])('does not mistake %s for noindex', (meta) => {
    expect(rules(GOOD_HEAD + meta)).toEqual([]);
  });
});

describe('SC-UNIT-011 SEO checks: canonical', () => {
  it('accepts a relative canonical URL, which resolves against the page', () => {
    expect(rules(headWith(CANONICAL, '<link rel="canonical" href="/products/shoes">'))).toEqual([]);
  });

  it('finds canonical among several rel values', () => {
    expect(rules(headWith(CANONICAL, '<link rel="Canonical alternate" href="">'))).toEqual([
      'seo-canonical-invalid:violation',
    ]);
  });

  it('flags conflicting canonical links', () => {
    expect(rules(GOOD_HEAD + '<link rel="canonical" href="https://example.com/shoes">')).toEqual([
      'seo-canonical-multiple:violation',
    ]);
  });

  it.each(['', '   ', 'javascript:alert(1)', 'mailto:a@example.com', 'http://exa mple.com/'])(
    'flags the invalid canonical href "%s"',
    (href) => {
      expect(rules(headWith(CANONICAL, `<link rel="canonical" href="${href}">`))).toEqual([
        'seo-canonical-invalid:violation',
      ]);
    },
  );

  it('asks for review when the canonical points to another site', () => {
    expect(
      rules(headWith(CANONICAL, '<link rel="canonical" href="https://other.example/shoes">')),
    ).toEqual(['seo-canonical-cross-origin:needs-review']);
  });

  it('skips the cross-site comparison for local files', () => {
    expect(
      rules(
        headWith(CANONICAL, '<link rel="canonical" href="https://example.com/x">'),
        'file:///C:/site/a.html',
      ),
    ).toEqual([]);
  });

  it('does not count canonical checks as passed when there is no canonical link', () => {
    const result = check(headWith(CANONICAL, ''));
    expect(result.findings).toEqual([]);
    expect(result.passedRuleCount).toBe(8);
  });
});

describe('SC-UNIT-011 SEO findings fit the shared schema', () => {
  it('produces findings that pass the trust-boundary guard', () => {
    const { findings } = check(
      '<link rel="canonical" href=""><meta name="robots" content="noindex">',
    );
    expect(findings.length).toBeGreaterThan(3);
    expect(isScanResult(makeScanResult({ findings }))).toBe(true);
    for (const finding of findings) {
      expect(finding.source).toBe('seo');
      expect(finding.helpUrl).toMatch(/^https:\/\//);
    }
  });

  it('builds selectors that find the same element again', () => {
    const doc = new DOMParser().parseFromString(
      '<html><head><meta name="a"><meta name="b"></head><body></body></html>',
      'text/html',
    );
    const second = doc.querySelector('meta[name="b"]');
    if (!second) throw new Error('fixture missing');
    const selector = selectorFor(second);
    expect(selector).toBe('html > head > meta:nth-of-type(2)');
    expect(doc.querySelector(selector)).toBe(second);
  });
});

describe('SC-UNIT-012 combining accessibility and SEO results', () => {
  it('merges findings in severity order and adds the passed counts', () => {
    const result = makeScanResult({
      findings: [makeFinding({ ruleId: 'region', impact: 'moderate' })],
      passedRuleCount: 40,
    });
    const seo = {
      findings: [makeFinding({ ruleId: 'seo-noindex', source: 'seo', impact: 'serious' })],
      passedRuleCount: 9,
    };
    const merged = withSeoResults(result, seo);
    expect(merged.findings.map((f) => f.ruleId)).toEqual(['seo-noindex', 'region']);
    expect(merged.passedRuleCount).toBe(49);
    expect(merged.pageUrl).toBe(result.pageUrl);
  });
});
