# SiteCheck

A Chrome extension that finds common accessibility and basic SEO issues on the page you are
viewing.

SiteCheck checks a page for accessibility problems with [axe-core](https://github.com/dequelabs/axe-core)
and for basic SEO problems (title, meta description, viewport, `noindex`, canonical links)
with its own rules. It lists each finding with the affected elements and how to fix it,
filters by outcome, category and severity, highlights elements on the page, and exports
reports as JSON or CSV.

Automated checks find only a subset of accessibility problems. A clean SiteCheck result does
not mean a page conforms to WCAG; manual testing is still required.

## Install and use

1. Download `sitecheck-X.Y.Z.zip` from the
   [latest release](https://github.com/rakib78has/AccessScan/releases) and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and pick
   the unzipped folder. (Chrome Web Store installation will replace this once published.)
3. On any web page, click the SiteCheck icon, then **Scan this page**.
4. Open a finding to see the affected elements and a link to fix guidance; use **Highlight
   on page** to find an element, and **Download JSON** or **Download CSV** to keep a report.

SiteCheck reads a page only when you click its icon and press Scan, and sends nothing
anywhere. See the [privacy policy](PRIVACY.md) and what it can and cannot detect in
[docs/accuracy.md](docs/accuracy.md).

## Requirements for development

- Node.js 24 (see `.nvmrc`; 20.19+ works) and npm 11
- Chrome or Chromium 116+

## Development

```sh
npm ci                 # install exactly what package-lock.json records
npm run dev            # rebuild dist/ on every change
```

To load it in Chrome, open `chrome://extensions`, turn on **Developer mode**, choose **Load
unpacked**, and select the `dist/` folder. After a rebuild, press the reload icon on the
extension card.

## Commands

| Command                           | What it does                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `npm run build`                   | Production build into `dist/`                                                  |
| `npm run build:e2e`               | Test build into `dist-e2e/` (never release this)                               |
| `npm run validate:build`          | Checks `dist/` against the permission and packaging policy                     |
| `npm run lint`                    | ESLint, including type-aware and security rules                                |
| `npm run format:check`            | Prettier check (`npm run format` to fix)                                       |
| `npm run typecheck`               | TypeScript, strict                                                             |
| `npm test`                        | Unit, integration and component tests (Vitest)                                 |
| `npm run test:coverage`           | The same, with coverage thresholds and a report                                |
| `npm run test:e2e`                | Builds both, then runs Playwright against the extension                        |
| `npm run verify`                  | Everything CI runs except end-to-end tests                                     |
| `npm run package`                 | Validates `dist/` and writes `release/sitecheck-<version>.zip` and its SHA-256 |
| `npm run release:check -- v1.2.3` | Checks a tag against `package.json` and `CHANGELOG.md`                         |
| `npm run smoke:real-sites`        | Manual: runs the scanner on real public websites (needs internet; not in CI)   |

The first `test:e2e` run on a machine needs `npx playwright install chromium`.

## Documentation

- [Architecture](docs/architecture.md)
- [Testing](docs/testing.md) and the [test case register](docs/test-cases.md)
- [Security and privacy](docs/security.md)
- [Accuracy and known limits](docs/accuracy.md): what SiteCheck finds, flags for review, and
  misses
- [Release process](docs/release-process.md): versioning, tagging, store submission, rollback
- [Chrome Web Store listing](docs/store-listing.md): listing text, permission justifications,
  privacy answers and policy review
- [Privacy policy](PRIVACY.md)
- [Changelog](CHANGELOG.md)

## Known limitations

- SiteCheck can scan a tab only after you click its toolbar icon on that tab. This is
  deliberate; see [docs/security.md](docs/security.md).
- Browser pages (`chrome://`), other extensions and the Chrome Web Store cannot be scanned.
  Local `file://` pages need "Allow access to file URLs" turned on for SiteCheck.
- The contents of iframes and closed shadow roots are not scanned; each frame is listed as
  needing review.
- Invalid HTML such as duplicate `id` values is not reported; use an HTML validator.
- Scans that take longer than 25 seconds are stopped.
- SEO checks see the rendered page only, not HTTP headers or `robots.txt`.
- See [docs/architecture.md](docs/architecture.md#known-limitations) for details.
