# Testing

## Levels

| Level       | Tool                     | Where                | Runs in       |
| ----------- | ------------------------ | -------------------- | ------------- |
| Unit        | Vitest                   | `tests/unit/`        | Node          |
| Integration | Vitest                   | `tests/integration/` | Node          |
| Component   | Vitest + Testing Library | `tests/component/`   | jsdom         |
| End-to-end  | Playwright               | `tests/e2e/`         | Real Chromium |

**Integration tests** drive the real orchestrator, store and message handler, with Chrome
replaced by an in-memory storage area and scripted tab events (`tests/helpers/`). They cover
every way a scan can end: result, timeout, navigation, closed tab, bad output, storage
failure and concurrent requests.

**jsdom has no layout engine**, so colour contrast and anything else that depends on
rendering cannot be tested there. Those checks, and scanner accuracy in general, run in real
Chromium through Playwright.

## End-to-end setup

- `tests/e2e/fixtures.ts` launches a persistent context with `--load-extension` pointed at
  `dist-e2e/`, using Playwright's bundled Chromium in the new headless mode. Branded Chrome
  ignores `--load-extension`, and the old headless shell silently loads no extensions.
- `tests/helpers/fixture-server.mjs` serves `tests/fixtures/pages/` on `127.0.0.1:4173`.
  Playwright starts it automatically. No test touches a real website.
- **The `activeTab` grant cannot be automated.** Playwright cannot click the toolbar icon.
  The `dist-e2e/` build therefore adds a host permission for `127.0.0.1` (the release
  validator rejects it), and the real grant is covered by manual case SC-MAN-002.
- **The popup opens as a tab.** `popupFor(page)` opens `popup/index.html`, brings the target
  page to the front, and reloads the popup, so the popup sees the target as the active tab
  exactly as it would after a toolbar click. Clicks in the popup use `dispatchEvent`, because
  a background tab never runs the animation frames Playwright's stability check waits for.

## Fixture pages

| Page              | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `clean.html`      | No violations; the valid side of each rule, including decorative `alt=""` images |
| `violations.html` | One known violation per rule, each with an id the tests assert on                |
| `iframe.html`     | A cross-origin frame that cannot be scanned and must be reported for review      |
| `large.html`      | 4,000 script-generated rows, slow enough to navigate away mid-scan               |
| `seo-issues.html` | Five known SEO findings and no accessibility violations                          |

`clean.html` and `violations.html` carry valid SEO metadata so each page tests one thing.
SEO rules are unit-tested in jsdom against a known-good `<head>` with one line changed per
case (`tests/unit/seo-rules.test.ts`).

Fixtures are excluded from Prettier, since reformatting can change what a rule sees.

## Running

```sh
npm test                 # unit + integration + component
npm run test:coverage    # with coverage and thresholds (coverage/index.html)
npm run test:e2e         # builds dist/ and dist-e2e/, then runs Playwright
npx playwright test tests/e2e/scan.spec.ts --repeat-each=5   # flakiness check
```

## Conventions

- Test case IDs are stable and appear in test names: `SC-UNIT-nnn`, `SC-INT-nnn`,
  `SC-UI-nnn`, `SC-E2E-nnn`, `SC-SEC-nnn`, and `SC-MAN-nnn` for manual cases. The register is
  [test-cases.md](test-cases.md).
- No fixed sleeps: wait on events or state. No production websites: local fixtures only.
- A new protection gets a test that fails when the protection is removed. Milestone 2
  verified this by deleting each key check in turn (busy guard, result validation, stale-page
  check, sender URL check, https help URLs, node cap) and confirming a test failed. Milestone 3
  did the same for the help link's `rel`, lazy rendering, invalid selectors, the severity
  filter and overlay replacement. Milestone 4 did it for SVG titles, case-insensitive meta
  names, exact `noindex` matching, review-only length checks, canonical URL schemes and the
  passed-rule count. Milestone 5 did it for each CSV safeguard (formula prefixes, quote
  doubling, BOM, CRLF), file name sanitizing and the report disclaimer.
- CSV tests parse the output back with a strict RFC 4180 reader (`tests/helpers/csv-parse.ts`)
  rather than matching substrings, so they prove the file is well-formed.
- Run end-to-end tests with `npm run test:e2e`, which rebuilds first. Running
  `npx playwright test` alone uses whatever is already in `dist-e2e/`, which can be stale.

## Things jsdom cannot test

- **Keyboard toggling of `<details>`.** jsdom ignores Enter on a `<summary>`; SC-E2E-010
  checks it in Chromium.
- **Some axe rules.** Real Chromium flagged `label-content-name-mismatch` (WCAG 2.5.3) on the
  highlight buttons, which the jsdom run missed. The results view is therefore also checked
  with axe in Chromium, in both colour schemes (SC-E2E-012).

## Coverage

`vitest.config.ts` enforces at least 90% line and branch coverage for the scan logic and
trust-boundary modules: orchestrator, message handler, `src/messaging`,
`src/scanner/accessibility`, `src/storage`, `src/shared`, `src/content` and the popup's
`filters.ts` and `wcag.ts`. The run fails below that.

The Chrome adapter, service worker entry, scanner entry and popup bootstrap only run in a real
browser, so they show as uncovered; the end-to-end suite exercises them. Coverage is a floor,
not the goal: each test must assert behaviour that matters.
