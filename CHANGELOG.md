# Changelog

All notable changes are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
