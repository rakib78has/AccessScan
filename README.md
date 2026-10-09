# SiteCheck

A Chrome extension that finds common accessibility and basic SEO issues on the page you are
viewing.

> **Status: Milestone 1 (scaffold).** The extension builds, loads and shows its popup. Scanning
> arrives in Milestone 2. See [docs/architecture.md](docs/architecture.md) for the roadmap.

Automated checks find only a subset of accessibility problems. A clean SiteCheck result does
not mean a page conforms to WCAG; manual testing is still required.

## Requirements

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

| Command                  | What it does                                               |
| ------------------------ | ---------------------------------------------------------- |
| `npm run build`          | Production build into `dist/`                              |
| `npm run validate:build` | Checks `dist/` against the permission and packaging policy |
| `npm run lint`           | ESLint, including type-aware and security rules            |
| `npm run format:check`   | Prettier check (`npm run format` to fix)                   |
| `npm run typecheck`      | TypeScript, strict                                         |
| `npm test`               | Unit and component tests (Vitest)                          |
| `npm run test:coverage`  | The same, with a coverage report in `coverage/`            |
| `npm run test:e2e`       | Builds, then runs Playwright against the real extension    |
| `npm run verify`         | Everything CI runs except end-to-end tests                 |

The first `test:e2e` run on a machine needs `npx playwright install chromium`.

## Documentation

- [Architecture](docs/architecture.md)
- [Testing](docs/testing.md) and the [test case register](docs/test-cases.md)
- [Security and privacy](docs/security.md)
- [Changelog](CHANGELOG.md)

## Known limitations

- No scanning yet (Milestone 2).
- SiteCheck can scan a tab only after you click its toolbar icon on that tab. This is
  deliberate; see [docs/security.md](docs/security.md).
