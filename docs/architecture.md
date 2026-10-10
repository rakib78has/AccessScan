# Architecture

## Overview

```
 popup ──scan:start──▶ service worker ──executeScript(scanner.js)──▶ page (isolated world)
   ▲     ◀─accepted?──      │          ──executeScript(func)──────▶ axe-core runs,
   │                        │          ◀──────── ScanResult ──────── normalized in-page
   │                        ▼
   └──── storage.onChanged ── chrome.storage.session  { "scan:<tabId>": ScanState }
```

1. The popup finds the active tab and reads that tab's stored `ScanState`.
2. **Scan** sends `{ type: 'scan:start', tabId }`. The worker checks the sender and the
   message, refuses the request if a scan of that tab is already running or the page cannot be
   scanned, and otherwise stores `running` and replies `accepted`.
3. The worker injects `scanner.js`, which registers `__siteCheckScan` in the extension's
   isolated world; the page's own scripts cannot see or call it. A second `executeScript`
   calls it, and Chrome waits for the promise it returns.
4. The scanner runs axe-core, normalizes and trims the results, and returns a `ScanResult`.
5. The worker validates the result (`isScanResult`) and stores `done` or `error`. The popup
   is listening to storage and updates. If the popup was closed, it shows the stored state
   next time it opens.

A scan ends with exactly one of: result, error (timeout after 25 s, navigation, no access,
invalid result, failure) or, if the tab closes, nothing stored.

## Decisions

**User-initiated access (`activeTab`).** SiteCheck has no host permissions and no declared
content scripts. Clicking the toolbar icon grants temporary access to that one tab, and only
then is the scanner injected. Chrome shows no permission warning at install, and SiteCheck
cannot read pages the user did not ask it to scan. The cost is that there are no background
or scheduled scans; future multi-page features would request `optional_host_permissions` per
site at runtime.

**The service worker orchestrates scans, not the popup.** A popup is destroyed as soon as it
loses focus, which would abort a scan in progress. The worker owns the scan and writes the
outcome to `chrome.storage.session`. Chrome stops idle workers, so the worker keeps no state
that matters in memory. A `running` state older than 40 s is treated as orphaned by a
stopped worker, so it cannot block rescans forever.

**Orchestration takes its Chrome APIs as parameters.** `scan-orchestrator.ts` receives a
`ScanDeps` object; `chrome-adapter.ts` binds it to the real APIs. Every failure path
(timeouts, navigation, closed tabs, bad output, storage errors) is tested without a browser.

**Two injections, not one.** The scanner bundle only registers a function; a second
`executeScript({ func })` calls it. This avoids depending on what the last statement of a
bundled file evaluates to, and lets the call return a structured success or failure.

**Results are normalized inside the page.** Raw axe output can run to megabytes. The scanner
keeps at most 50 elements per rule, truncates HTML snippets to 300 characters and failure
summaries to 500, and counts passed rules rather than listing them.

**Restricted pages are detected twice.** When the URL is visible, `checkScannableUrl`
refuses it up front with a specific message. Without the `tabs` permission Chrome hides the
URL of pages SiteCheck has no access to (such as `chrome://` pages), so in that case the scan
is attempted and Chrome's injection error is classified instead.

**Navigation is detected from `status: 'loading'`.** That field is reported without the
`tabs` permission, unlike `url`. The popup also ignores a stored result whose page URL no
longer matches the tab, so a result is never shown for the wrong page.

**Generated manifest.** `manifest.config.ts` builds the manifest from the `package.json`
version, so the two cannot drift. A small Vite plugin emits it; no CRXJS dependency.

**Unminified build.** Readable output keeps Chrome Web Store review and debugging simple.
React is still its production build. `scanner.js` is 1.5 MB (277 kB gzipped) because it
contains axe-core; it is read from disk and parsed once per scan.

**TypeScript 6.0, not 7.** `typescript-eslint` 8.71 supports TypeScript below 6.1 only.

**No `eslint-plugin-jsx-a11y`.** Its latest release does not support ESLint 10. The popup is
instead tested with axe-core itself, in jsdom and in real Chromium.

**Highlighting runs from the popup.** `useHighlight` calls `chrome.scripting.executeScript`
directly with `highlightElement` from `src/content/highlight.ts`. It is a short user action
and the popup already holds the `activeTab` grant, so routing it through the worker would add
a message type without adding safety. The selector is page-derived, so it travels in `args`
(serialized data) and is only ever passed to `querySelector`. The function must be
self-contained because Chrome serializes it into the page. It draws a separate overlay
element and never changes the page's own elements or styles.

**Findings use native `<details>`.** Keyboard and screen reader behaviour come from the
browser with no custom ARIA. Affected elements render only when a finding is opened, since a
large page can list thousands.

**SEO checks are SiteCheck's own rules, run in the same injected bundle.** They are pure
functions over the `Document` (`src/scanner/seo/seo-rules.ts`), so they are unit-tested in
jsdom. Each check returns a finding, `pass` or `not-applicable`, so the passed-rule count never
includes checks that did not run (title length when there is no title, for example).

- **Violations** are definite: no title, more than one title, no or duplicate meta description,
  no viewport tag, conflicting or invalid canonical links.
- **Needs review** covers guidelines and choices that may be intentional: title or description
  length (search engines truncate by pixel width, not characters), `noindex`, and canonical
  links to another site.
- Rules about something missing apply to the whole page; they list no elements and put the
  fix in the description.
- Language is not checked here because axe already does (`html-has-lang`). A missing title is
  reported by both axe (accessibility, WCAG 2.4.2) and the SEO check, since they are different
  reasons to fix the same thing.

## Source layout

| Path                     | Responsibility                                                               |
| ------------------------ | ---------------------------------------------------------------------------- |
| `manifest.config.ts`     | The manifest, as a pure function of the version                              |
| `src/popup/`             | Popup UI; Chrome calls live in `hooks/`, logic in `filters.ts` and `wcag.ts` |
| `src/content/`           | Functions injected into the page on demand (element highlight)               |
| `src/background/`        | Service worker, message handler, orchestrator, Chrome glue                   |
| `src/scanner/`           | Injected bundle: axe-core run, SEO checks (`seo/`), normalization            |
| `src/messaging/`         | Message contracts and runtime guards for trust boundaries                    |
| `src/storage/`           | Per-tab scan state in `chrome.storage.session`                               |
| `src/shared/`            | Result schema, error codes and messages, URL checks                          |
| `src/styles/`            | Tailwind entry stylesheet                                                    |
| `scripts/`               | Build validation (and, later, packaging)                                     |
| `vite.scanner.config.ts` | Builds `scanner.js` as a self-contained classic script                       |

## Known limitations

- **Frames are not scanned.** Only the top-level document is injected; axe reports each
  iframe under `frame-tested` as needing review. `activeTab` does not cover cross-origin
  frames.
- **In-page navigation in single-page apps** does not emit `status: 'loading'`, so a route
  change during a scan is not detected. The result is still labelled with the URL it was
  scanned at.
- **Scans longer than 25 s time out**, to stay within the service worker's idle lifetime.
- Closed shadow roots cannot be inspected; open shadow roots are.
- Elements inside iframes cannot be highlighted. Inside a container that scrolls on its own,
  the highlight can drift if that container is scrolled while it shows; it disappears after
  3 seconds.
- **SEO checks read the rendered page**, after scripts run. They cannot see HTTP headers
  (`X-Robots-Tag`, `Link: rel=canonical`), `robots.txt`, or the raw HTML a crawler receives,
  so a page can be blocked from search in ways SiteCheck does not report.
- Title and description lengths are counted in characters; search engines truncate by
  display width and may rewrite both.

## Milestones

1. **Scaffold**: toolchain, valid MV3 package, popup shell, smoke tests, CI. _(done)_
2. **Scanner foundation**: message contracts, orchestration, axe-core, error handling. _(done)_
3. **Results UI**: findings list, filters, fix guidance, highlighting, error boundary. _(done)_
4. **SEO checks**: title, meta description, viewport, robots, canonical. _(done)_
5. Reporting: JSON and CSV export with injection protection.
6. Browser automation: wider end-to-end journeys and regression fixtures.
7. CI/CD and security: release workflow, packaging, security review.
8. Release readiness: documentation, manual cross-site verification, Web Store review.
