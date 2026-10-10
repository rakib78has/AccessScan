# Accuracy and known limits

What SiteCheck reports, what it only flags for review, and what it misses. Every statement
here is backed by a fixture in `tests/fixtures/pages/` whose results are pinned in
`tests/fixtures/expected/` and checked on every CI run (SC-E2E-017).

Automated checks cannot establish WCAG conformance. Treat a clean result as "no known
automated failures", never as "accessible".

## Confirmed behaviour

| Case                                                                | Result                                                                | Fixture                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------- |
| Image without `alt`                                                 | Violation (`image-alt`)                                               | `violations.html`                     |
| Decorative image with `alt=""`                                      | Not reported, correctly                                               | `violations.html`, `clean.html`       |
| Hidden image (`display: none`) or `aria-hidden` image without `alt` | Not reported, correctly                                               | `unusual-markup.html`                 |
| Content inside `<template>`                                         | Not reported, correctly (inert)                                       | `unusual-markup.html`                 |
| Unlabeled form field                                                | Violation (`label`)                                                   | `violations.html`                     |
| Link with no accessible name                                        | Violation (`link-name`)                                               | `violations.html`                     |
| Normal text below 4.5:1                                             | Violation (`color-contrast`)                                          | `contrast.html` `#fail`               |
| Large text (24px) at 3.03:1                                         | Not reported, correctly (large text needs 3:1)                        | `contrast.html` `#large-pass`         |
| Semi-transparent text (blends to 2.1:1)                             | Violation; opacity is accounted for                                   | `contrast.html` `#translucent`        |
| Text over a gradient or background image                            | Needs review, not guessed                                             | `contrast.html` `#gradient`, `#image` |
| Problems inside an open shadow root                                 | Reported, e.g. `#open-host >>> img`; highlight reaches them           | `shadow-dom.html`                     |
| SVG `<title>`                                                       | Not mistaken for a second page title                                  | `unusual-markup.html`                 |
| Very long attribute values                                          | Snippets truncated to 300 characters (unit test SC-UNIT-004)          | `unusual-markup.html`                 |
| Empty or almost bare page                                           | Scan completes; missing landmarks, heading, title and `lang` reported | `empty.html`, `bare.html`             |

## Known misses (false negatives)

| Case                                                                      | Why                                                                                                            | Fixture                             |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Problems inside a **closed** shadow root                                  | Nothing outside a closed component can see into it, by design of the platform                                  | `shadow-dom.html` `#closed-host`    |
| Problems inside **iframes**, same-origin or not                           | The scanner runs in the top document only; each frame is listed under `frame-tested` as needing review instead | `iframe.html`, `nested-frames.html` |
| **Duplicate `id` values** and other invalid HTML                          | axe-core 4.14 no longer runs its duplicate-id rules by default; use an HTML validator for markup validity      | `unusual-markup.html` `#dup`        |
| Content added **after** the scan                                          | A scan is a snapshot; scan again after the page changes                                                        | `dynamic.html` (SC-E2E-018)         |
| `noindex` or canonical sent as **HTTP headers**, or rules in `robots.txt` | SEO checks read the rendered page only                                                                         | n/a                                 |

## Things that look odd but are intended

- **A missing title is reported twice**: by axe (`document-title`, accessibility, WCAG 2.4.2)
  and by the SEO check (`seo-title-missing`). They are two reasons to fix the same thing, and
  the Category filter separates them.
- **Some violations have no WCAG criterion.** axe's best-practice rules, such as
  `landmark-one-main` and `page-has-heading-one`, are recommended practice rather than WCAG
  failures. Their findings show no "WCAG success criteria" line.
- **`frame-tested` is rated critical.** That is axe's rating for "this frame was not
  checked", and it is filed under needs review, not violations.

## Real-site smoke test (2026-10-10)

`npm run smoke:real-sites` runs the built scanner on public websites to check it copes with
real-world markup. It is run by hand, never in CI, because live sites change daily. One
difference from the extension: the harness evaluates the scanner in the page's own JavaScript
world, not the extension's isolated world.

| Site                           | Scan time | Result size | Accessibility violations (rules)                                                                               | Needs review | SEO findings |
| ------------------------------ | --------- | ----------- | -------------------------------------------------------------------------------------------------------------- | ------------ | ------------ |
| w3.org                         | 0.3 s     | 3 KB        | 1 (`image-alt`)                                                                                                | 0            | 2            |
| w3.org/WAI                     | 0.6 s     | 1 KB        | 0                                                                                                              | 1            | 0            |
| developer.mozilla.org          | 0.4 s     | 4 KB        | 3 (`landmark-one-main`, `landmark-unique`, `region`)                                                           | 1            | 0            |
| gov.uk                         | 0.4 s     | 1 KB        | 1 (`region`)                                                                                                   | 0            | 0            |
| en.wikipedia.org (one article) | 1.9 s     | 64 KB       | 4 (`color-contrast`, `link-in-text-block`, `link-name`, `aria-allowed-role`)                                   | 4            | 1            |
| github.com                     | 0.7 s     | 12 KB       | 1 (`landmark-unique`)                                                                                          | 2            | 2            |
| news.ycombinator.com           | 0.5 s     | 23 KB       | 7 (`image-alt`, `label`, `color-contrast`, `link-name`, `landmark-one-main`, `page-has-heading-one`, `region`) | 1            | 1            |
| bbc.co.uk/news                 | 0.9 s     | 41 KB       | 2 (`aria-hidden-focus`, `heading-order`)                                                                       | 2            | 1            |

What this shows: every scan finished in under 2 seconds (the limit is 25), every result passed
the extension's own validation, and the largest result was 64 KB against a 10 MB storage
limit. Findings are plausible for each site: the W3C accessibility pages report the fewest
problems, and Hacker News's known missing labels and low contrast are found.

What it does not show: that the findings are complete or that every one is correct. Counts
are rules, not elements, and live pages change, so a rerun will differ. A finding spot-checked
by hand: example.com (since removed from the list, because the site asks not to be used for
testing) was flagged for no `<h1>` and no main landmark; its current markup confirms both.

## Keeping this document true

The regression suite fails whenever results for a fixture change. After an intended change
(for example an axe-core upgrade), regenerate the expected files with
`UPDATE_GOLDEN=1 npx playwright test tests/e2e/regression.spec.ts`, review every changed line,
and update this document to match.
