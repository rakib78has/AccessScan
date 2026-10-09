# Architecture

## Overview

```
 popup (React) --scan:start--> service worker --executeScript--> scanner bundle (in page)
      ^                              |                            axe-core + SEO rules,
      |                              v                            normalized in the page
      +------ reads ------ chrome.storage.session <---- stores result ----+
```

This flow is planned from Milestone 2. Milestone 1 contains only the popup shell and an idle
service worker.

## Decisions

**User-initiated access (`activeTab`).** SiteCheck has no host permissions and no declared
content scripts. Clicking the toolbar icon grants temporary access to that one tab, and only
then is the scanner injected with `chrome.scripting.executeScript`. Chrome shows no
permission warning at install, and SiteCheck cannot read pages the user did not ask it to
scan. The cost is that there are no background or scheduled scans; future multi-page
features would request `optional_host_permissions` per site at runtime.

**The service worker orchestrates scans, not the popup.** A popup is destroyed as soon as it
loses focus, which would abort a scan in progress. The worker owns the scan and writes
results to `chrome.storage.session`, keyed by tab, so a reopened popup still shows them.
Chrome stops idle workers, so the worker keeps no state that matters in memory.

**The scanner is a separate classic-script bundle.** `executeScript({ files })` does not run
ES modules, so the scanner (with axe-core) gets its own IIFE build. Results are normalized
and trimmed inside the page before crossing the message boundary, which keeps large axe
payloads out of messages and session storage.

**Generated manifest.** `manifest.config.ts` builds the manifest from the `package.json`
version, so the two cannot drift. A small Vite plugin emits it; no CRXJS dependency.

**Unminified build.** Readable output keeps Chrome Web Store review and debugging simple.
React is still its production build.

**TypeScript 6.0, not 7.** `typescript-eslint` 8.71 supports TypeScript below 6.1 only.

**No `eslint-plugin-jsx-a11y`.** Its latest release does not support ESLint 10. The popup is
instead tested with axe-core itself, in jsdom and in real Chromium.

## Source layout

| Path                 | Responsibility                                   |
| -------------------- | ------------------------------------------------ |
| `manifest.config.ts` | The manifest, as a pure function of the version  |
| `src/popup/`         | Popup UI                                         |
| `src/background/`    | MV3 service worker                               |
| `src/styles/`        | Tailwind entry stylesheet                        |
| `scripts/`           | Build validation (and, later, packaging)         |
| `tests/`             | `unit/`, `component/`, `e2e/`, shared `helpers/` |

Directories for the scanner, messaging, reports and storage are added in the milestone that
first needs them.

## Milestones

1. **Scaffold**: toolchain, valid MV3 package, popup shell, smoke tests, CI. _(done)_
2. Scanner foundation: message contracts, orchestration, axe-core, error handling.
3. Results UI: findings list, filters, remediation, loading and error states.
4. SEO checks: title, meta description, viewport, robots, canonical.
5. Reporting: JSON and CSV export with injection protection.
6. Browser automation: end-to-end scan journeys against local fixtures.
7. CI/CD and security: release workflow, packaging, security review.
8. Release readiness: documentation, manual cross-site verification, Web Store review.
