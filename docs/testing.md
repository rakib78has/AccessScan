# Testing

## Levels

| Level      | Tool                     | Where              | Runs in       |
| ---------- | ------------------------ | ------------------ | ------------- |
| Unit       | Vitest                   | `tests/unit/`      | Node          |
| Component  | Vitest + Testing Library | `tests/component/` | jsdom         |
| End-to-end | Playwright               | `tests/e2e/`       | Real Chromium |

Integration tests (`tests/integration/`) start in Milestone 2 with the messaging layer.

**jsdom has no layout engine**, so colour contrast and anything else that depends on
rendering cannot be tested there. Those checks run in real Chromium through Playwright.

## Loading the extension in Playwright

`tests/e2e/fixtures.ts` launches a persistent context with `--load-extension` pointed at
`dist/`, using Playwright's bundled Chromium in the new headless mode. Branded Chrome ignores
`--load-extension`, and the old headless shell silently loads no extensions.

**Known gap:** Playwright cannot click the toolbar icon, so it cannot trigger the `activeTab`
grant. From Milestone 2, end-to-end scans will use a test-only build that adds a `127.0.0.1`
host permission (the release build validator rejects it), and the real `activeTab` flow stays
on the manual checklist.

## Running

```sh
npm test                 # unit + component
npm run test:coverage    # with coverage (coverage/index.html)
npm run test:e2e         # builds, then runs Playwright
```

## Conventions

- Test case IDs are stable and appear in test names: `SC-UNIT-nnn`, `SC-UI-nnn`, `SC-INT-nnn`,
  `SC-E2E-nnn`, `SC-SEC-nnn`, and `SC-MAN-nnn` for manual cases. The register is
  [test-cases.md](test-cases.md).
- No fixed sleeps: wait on events or state. No production websites: local fixtures only.

## Coverage targets

Targets are set per module once it has real logic (Milestone 2 onward). Scanner
normalization, message guards and exporters aim for at least 90% line and branch coverage.
Coverage is a floor, not the goal; each test must assert behaviour that matters.
