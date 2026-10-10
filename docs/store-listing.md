# Chrome Web Store listing

Everything needed to submit SiteCheck, written to be pasted into the
[Developer Dashboard](https://chrome.google.com/webstore/devconsole). Check it against the
dashboard's current form before submitting; field names change over time.

## Store listing

**Name:** SiteCheck

**Summary** (from the manifest, at most 132 characters):
Find common accessibility and basic SEO issues on the page you are viewing.

**Category:** Developer Tools **Language:** English

**Description:**

> SiteCheck checks the page you are viewing for common accessibility and basic SEO problems,
> and explains how to fix them.
>
> • Accessibility checks powered by axe-core, the open-source engine used across the industry
> • Basic SEO checks: page title, meta description, viewport, noindex, canonical links
> • Findings grouped as violations or "needs review", filterable by category and severity
> • Each finding lists the affected elements, WCAG criteria and a link to fix guidance
> • "Highlight on page" scrolls to an affected element and outlines it
> • Export a report as JSON or CSV
>
> Private by design: SiteCheck reads a page only when you click its icon and press Scan, keeps
> results only until you close the browser, and sends nothing anywhere. No account, no
> tracking, no network requests.
>
> Automated checks find only some accessibility problems. A clean result does not mean a page
> meets WCAG; manual testing with a keyboard and a screen reader is still needed.

## Privacy practices tab

**Single purpose:**
SiteCheck checks the web page the user is viewing for common accessibility and basic SEO
issues and reports them.

**Permission justifications:**

| Permission  | Justification                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `activeTab` | Reads only the tab where the user clicks the SiteCheck icon, so the extension needs no access to any website in advance.                                     |
| `scripting` | Injects the bundled checking code (axe-core and SiteCheck's SEO rules) into that tab when the user presses Scan, and outlines an element when the user asks. |
| `storage`   | Keeps the latest result per tab in session storage so it survives the popup closing; cleared when the browser closes.                                        |

**Remote code:** No, I am not using remote code. All code, including axe-core, is bundled in
the package; the extension makes no network requests.

**Data usage:** SiteCheck collects none of the listed data categories. Certify that data is
not sold to third parties, not used for purposes unrelated to the single purpose, and not used
to determine creditworthiness.

**Privacy policy URL:**
<https://github.com/rakib78has/AccessScan/blob/main/PRIVACY.md>

## Package

Upload `sitecheck-X.Y.Z.zip` from the GitHub release, after checking it against its
`.sha256` file. It contains the manifest, icons (16, 32, 48, 128 px), the popup, the service
worker, the scanner, and the third-party licence notices.

## Still needed before the first submission

These cannot be produced from the repository and are for the publisher to prepare:

- [ ] A Chrome Web Store developer account (one-time registration, verified contact email).
- [ ] At least one screenshot, 1280×800 or 640×400, showing SiteCheck's popup with results.
- [ ] A small promotional tile, 440×280 (optional, but used in store listings).
- [ ] A decision on publishing visibility (public, unlisted, or private to testers first).
- [ ] The manual checks SC-MAN-001 and SC-MAN-002 on the package being submitted.

## Policy self-review (2026-10-10)

| Requirement             | Status                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| Manifest V3             | Yes                                                                             |
| Single, clear purpose   | Yes, stated above                                                               |
| Minimum permissions     | `activeTab`, `scripting`, `storage`; no host permissions, no install warnings   |
| No remotely hosted code | Yes; enforced by the build validator and CSP `script-src 'self'`                |
| No obfuscation          | Code is unminified and readable                                                 |
| User data               | None collected or transmitted; privacy policy published                         |
| Third-party licences    | Notices bundled for React (MIT) and axe-core (MPL-2.0, source location given)   |
| Accurate description    | Claims are backed by tests; limits stated in the listing and `docs/accuracy.md` |
