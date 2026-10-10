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

## Keeping this document true

The regression suite fails whenever results for a fixture change. After an intended change
(for example an axe-core upgrade), regenerate the expected files with
`UPDATE_GOLDEN=1 npx playwright test tests/e2e/regression.spec.ts`, review every changed line,
and update this document to match.
