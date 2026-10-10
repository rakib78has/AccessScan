import type { AffectedNode, Finding, Impact, Outcome } from '../../shared/types/scan';
import { MAX_HTML_LENGTH, truncate } from '../accessibility/normalize';

/*
 * Basic on-page SEO checks. Each check returns a finding, 'pass', or
 * 'not-applicable' (for example, title length when there is no title), so
 * the passed-rule count never claims a check that did not run.
 *
 * Length limits are guidelines: search engines truncate by pixel width and
 * may rewrite titles and snippets. Those checks are therefore "needs review",
 * never violations.
 *
 * These checks read the rendered DOM, after scripts have run. They cannot see
 * HTTP headers (X-Robots-Tag, Link: rel=canonical) or the raw HTML a crawler
 * receives.
 */

export interface SeoCheckResult {
  findings: Finding[];
  passedRuleCount: number;
}

type CheckOutcome = Finding | 'pass' | 'not-applicable';
type Check = (doc: Document, pageUrl: URL | null) => CheckOutcome;

export const TITLE_LENGTH = { min: 10, max: 60 } as const;
export const DESCRIPTION_LENGTH = { min: 50, max: 160 } as const;

const HELP = {
  title: 'https://developers.google.com/search/docs/appearance/title-link',
  description: 'https://developers.google.com/search/docs/appearance/snippet',
  viewport:
    'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport',
  noindex: 'https://developers.google.com/search/docs/crawling-indexing/block-indexing',
  canonical:
    'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
} as const;

const XHTML = 'http://www.w3.org/1999/xhtml';

interface FindingSpec {
  ruleId: string;
  outcome: Outcome;
  impact: Impact;
  title: string;
  description: string;
  helpUrl: string;
  /** Affected elements; empty for rules about something missing from the whole page. */
  elements?: Element[];
  summary: string;
}

function finding(spec: FindingSpec): Finding {
  const elements = spec.elements ?? [];
  return {
    source: 'seo',
    ruleId: spec.ruleId,
    outcome: spec.outcome,
    impact: spec.impact,
    title: spec.title,
    // With no element to attach the fix to, it goes in the description instead.
    description: elements.length > 0 ? spec.description : `${spec.description} ${spec.summary}`,
    helpUrl: spec.helpUrl,
    wcagTags: [],
    nodeCount: elements.length,
    nodes: elements.map((el) => toNode(el, spec.summary)),
  };
}

function toNode(element: Element, failureSummary: string): AffectedNode {
  return {
    target: selectorFor(element),
    html: truncate(element.outerHTML, MAX_HTML_LENGTH),
    failureSummary,
  };
}

/** A structural selector (`html > head > meta:nth-of-type(2)`) that needs no ids or escaping. */
export function selectorFor(element: Element): string {
  const parts: string[] = [];
  let current = element;
  let parent = current.parentElement;
  while (parent) {
    const tag = current.localName;
    const sameTag = Array.from(parent.children).filter((c) => c.localName === tag);
    const position = sameTag.indexOf(current) + 1;
    parts.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${String(position)})` : tag);
    current = parent;
    parent = current.parentElement;
  }
  parts.unshift(current.localName);
  return parts.join(' > ');
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** HTML <title> elements only; an SVG's <title> is an accessible name, not the page title. */
function titleElements(doc: Document): Element[] {
  return Array.from(doc.getElementsByTagName('title')).filter((el) => el.namespaceURI === XHTML);
}

/** Meta names are case-insensitive, so `Description` and `description` both count. */
function metaByName(doc: Document, ...names: string[]): HTMLMetaElement[] {
  return Array.from(doc.querySelectorAll<HTMLMetaElement>('meta[name]')).filter((el) =>
    names.includes((el.getAttribute('name') ?? '').trim().toLowerCase()),
  );
}

const checks: Check[] = [
  function titleMissing(doc) {
    const titles = titleElements(doc);
    if (titles.some((t) => collapse(t.textContent) !== '')) return 'pass';
    return finding({
      ruleId: 'seo-title-missing',
      outcome: 'violation',
      impact: 'serious',
      title: 'Page has no title',
      description:
        'Search results and browser tabs show the page title; without one, search engines invent it.',
      helpUrl: HELP.title,
      elements: titles,
      summary: 'Add a <title> element inside <head> that describes this page.',
    });
  },

  function titleMultiple(doc) {
    const titles = titleElements(doc);
    if (titles.length < 2) return titles.length === 0 ? 'not-applicable' : 'pass';
    return finding({
      ruleId: 'seo-title-multiple',
      outcome: 'violation',
      impact: 'moderate',
      title: 'Page has more than one title element',
      description: 'A page may have only one <title>. Browsers use the first and ignore the rest.',
      helpUrl: HELP.title,
      elements: titles,
      summary: 'Keep one <title> element and remove the others.',
    });
  },

  function titleLength(doc) {
    const first = titleElements(doc)[0];
    const text = first ? collapse(first.textContent) : '';
    if (text === '') return 'not-applicable';
    if (text.length >= TITLE_LENGTH.min && text.length <= TITLE_LENGTH.max) return 'pass';
    return finding({
      ruleId: 'seo-title-length',
      outcome: 'needs-review',
      impact: 'minor',
      title: `Title is ${String(text.length)} characters long`,
      description: `Titles of about ${String(TITLE_LENGTH.min)}–${String(TITLE_LENGTH.max)} characters usually display in full. Search engines truncate by width, so check how it reads.`,
      helpUrl: HELP.title,
      elements: first ? [first] : [],
      summary:
        text.length < TITLE_LENGTH.min
          ? 'The title may be too short to describe the page. Consider making it more specific.'
          : 'The title may be cut off in search results. Put the most important words first.',
    });
  },

  function descriptionMissing(doc) {
    const metas = metaByName(doc, 'description');
    if (metas.some((m) => collapse(m.content) !== '')) return 'pass';
    return finding({
      ruleId: 'seo-meta-description-missing',
      outcome: 'violation',
      impact: 'moderate',
      title: 'Page has no meta description',
      description: 'Search engines often use the meta description as the snippet under the result.',
      helpUrl: HELP.description,
      elements: metas,
      summary:
        'Add <meta name="description" content="…"> summarising this page in a sentence or two.',
    });
  },

  function descriptionMultiple(doc) {
    const metas = metaByName(doc, 'description');
    if (metas.length < 2) return metas.length === 0 ? 'not-applicable' : 'pass';
    return finding({
      ruleId: 'seo-meta-description-multiple',
      outcome: 'violation',
      impact: 'moderate',
      title: 'Page has more than one meta description',
      description: 'With several descriptions it is unclear which one search engines will use.',
      helpUrl: HELP.description,
      elements: metas,
      summary: 'Keep one meta description and remove the others.',
    });
  },

  function descriptionLength(doc) {
    const first = metaByName(doc, 'description').find((m) => collapse(m.content) !== '');
    if (!first) return 'not-applicable';
    const length = collapse(first.content).length;
    if (length >= DESCRIPTION_LENGTH.min && length <= DESCRIPTION_LENGTH.max) return 'pass';
    return finding({
      ruleId: 'seo-meta-description-length',
      outcome: 'needs-review',
      impact: 'minor',
      title: `Meta description is ${String(length)} characters long`,
      description: `Descriptions of about ${String(DESCRIPTION_LENGTH.min)}–${String(DESCRIPTION_LENGTH.max)} characters usually display well. Search engines may truncate or rewrite them.`,
      helpUrl: HELP.description,
      elements: [first],
      summary:
        length < DESCRIPTION_LENGTH.min
          ? 'The description may be too short to be useful as a search snippet.'
          : 'The description may be cut off. Put the key information first.',
    });
  },

  function viewportMissing(doc) {
    if (metaByName(doc, 'viewport').length > 0) return 'pass';
    return finding({
      ruleId: 'seo-viewport-missing',
      outcome: 'violation',
      impact: 'moderate',
      title: 'Page has no viewport meta tag',
      description:
        'Without it, phones render the page at desktop width and shrink it, which hurts mobile usability.',
      helpUrl: HELP.viewport,
      summary:
        'Add <meta name="viewport" content="width=device-width, initial-scale=1"> inside <head>.',
    });
  },

  function noindex(doc) {
    const blocking = metaByName(doc, 'robots', 'googlebot').filter((m) =>
      m.content
        .toLowerCase()
        .split(/[\s,]+/)
        .some((directive) => directive === 'noindex' || directive === 'none'),
    );
    if (blocking.length === 0) return 'pass';
    return finding({
      ruleId: 'seo-noindex',
      outcome: 'needs-review',
      impact: 'serious',
      title: 'Page asks search engines not to index it',
      description:
        'A robots meta tag contains "noindex", so this page will not appear in search results. That is right for private or staging pages and wrong for public ones.',
      helpUrl: HELP.noindex,
      elements: blocking,
      summary:
        'If this page should appear in search results, remove "noindex" from the robots meta tag.',
    });
  },

  function canonicalMultiple(doc) {
    const links = canonicalLinks(doc);
    if (links.length < 2) return links.length === 0 ? 'not-applicable' : 'pass';
    return finding({
      ruleId: 'seo-canonical-multiple',
      outcome: 'violation',
      impact: 'serious',
      title: 'Page declares more than one canonical URL',
      description: 'Conflicting canonical links may cause search engines to ignore all of them.',
      helpUrl: HELP.canonical,
      elements: links,
      summary: 'Keep a single <link rel="canonical"> element.',
    });
  },

  function canonicalInvalid(doc, pageUrl) {
    const links = canonicalLinks(doc);
    if (links.length === 0) return 'not-applicable';
    const invalid = links.filter((link) => resolveCanonical(link, pageUrl) === null);
    if (invalid.length === 0) return 'pass';
    return finding({
      ruleId: 'seo-canonical-invalid',
      outcome: 'violation',
      impact: 'serious',
      title: 'Canonical link is empty or not a web address',
      description:
        'A canonical link must point to an http or https URL, or search engines will ignore it.',
      helpUrl: HELP.canonical,
      elements: invalid,
      summary: 'Set href to the full URL of the preferred version of this page.',
    });
  },

  function canonicalCrossOrigin(doc, pageUrl) {
    const links = canonicalLinks(doc);
    // An opaque origin (such as a local file) has nothing meaningful to compare against.
    if (links.length === 0 || !pageUrl || pageUrl.origin === 'null') return 'not-applicable';
    const elsewhere = links.filter((link) => {
      const url = resolveCanonical(link, pageUrl);
      return url !== null && url.origin !== pageUrl.origin;
    });
    if (elsewhere.length === 0) return 'pass';
    return finding({
      ruleId: 'seo-canonical-cross-origin',
      outcome: 'needs-review',
      impact: 'minor',
      title: 'Canonical link points to a different site',
      description:
        'Search engines will treat the other site as the main copy of this page. That is right for syndicated content and a mistake otherwise.',
      helpUrl: HELP.canonical,
      elements: elsewhere,
      summary: 'Check that the canonical URL is the address you want to appear in search results.',
    });
  },
];

function canonicalLinks(doc: Document): HTMLLinkElement[] {
  return Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel]')).filter((link) =>
    link.rel.toLowerCase().split(/\s+/).includes('canonical'),
  );
}

function resolveCanonical(link: HTMLLinkElement, pageUrl: URL | null): URL | null {
  const href = (link.getAttribute('href') ?? '').trim();
  if (href === '') return null;
  try {
    const url = new URL(href, pageUrl ?? undefined);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function runSeoChecks(doc: Document, pageUrl: string): SeoCheckResult {
  let base: URL | null;
  try {
    base = new URL(pageUrl);
  } catch {
    base = null;
  }

  const findings: Finding[] = [];
  let passedRuleCount = 0;
  for (const check of checks) {
    const outcome = check(doc, base);
    if (outcome === 'pass') passedRuleCount += 1;
    else if (outcome !== 'not-applicable') findings.push(outcome);
  }
  return { findings, passedRuleCount };
}
