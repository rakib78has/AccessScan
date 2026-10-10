# Changelog

All notable changes are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-10

First release.

### Added

- Third-party licence notices (React, MIT; axe-core, MPL-2.0 with source location) generated
  from the modules actually bundled, and required by the build validator.
- Privacy policy (`PRIVACY.md`) and Chrome Web Store listing material (`docs/store-listing.md`).
- Manual real-site smoke test (`npm run smoke:real-sites`); results in `docs/accuracy.md`.
- Release workflow: pushing a `vX.Y.Z` tag re-runs every check and publishes a GitHub release
  with a reproducible store zip, its SHA-256 checksum and the changelog notes.
- Regression suite: 11 fixture pages (contrast edge cases, shadow DOM, dynamic content, frames,
  unusual markup, empty pages) checked against reviewed expected results on every CI run.
- `docs/accuracy.md`: what SiteCheck finds, flags for review and misses, with evidence.
- Export a scan as JSON (versioned report with summary and disclaimer) or CSV (one row per
  affected element), protected against spreadsheet formula injection. No new permissions.
- SEO checks: missing or duplicate title and meta description, missing viewport tag,
  conflicting or invalid canonical links (violations); title and description length,
  `noindex`, and canonical links to another site (needs review).
- Category filter (Accessibility / SEO); filter counts reflect the other active filters.
- Highlighting an element that is not displayed, such as one in the page head, says so.
- Findings list: each rule with severity, WCAG criteria, affected elements (selector, HTML
  snippet, failure summary) and a link to fix guidance.
- Filters by outcome (violations or needs review) and severity, with counts.
- "Highlight on page" scrolls to an affected element and outlines it for three seconds.
- The results view recovers from rendering errors instead of blanking the popup.
- Accessibility scanning of the current tab with axe-core 4.14, run by the service worker and
  shown in the popup as violation, needs-review and passed-rule counts.
- Clear explanations when a page cannot be scanned (browser pages, local files without
  access, missing access, navigation mid-scan, timeouts).
- Last scan per tab kept for the browser session; URLs stored without query or fragment.
- Permissions: `activeTab`, `scripting`, `storage`.
- Manifest V3 extension scaffold: popup shell, service worker, generated manifest.
- Build validation that enforces the permission policy.
- Unit, component and end-to-end test harness; GitHub Actions CI.

### Security

- Explicit content security policy (`script-src 'self'; object-src 'self'`), stricter than
  Chrome's default, which also trusts localhost scripts.
- axe-core's optional stylesheet download is switched off; scans make no network requests.
- Builds are rejected if SiteCheck's own code contains `eval`, `new Function` or network calls.
