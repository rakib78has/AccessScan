# Changelog

All notable changes are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
