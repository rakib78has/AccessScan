# Security and privacy

## Permissions

| Permission  | Why                                                       |
| ----------- | --------------------------------------------------------- |
| `activeTab` | Temporary access to the tab the user clicked SiteCheck on |
| `scripting` | Inject the scanner into that tab                          |
| `storage`   | Keep the last scan per tab in `chrome.storage.session`    |

None of these produces a permission warning at install.

SiteCheck never declares `host_permissions`, `optional_host_permissions`, `content_scripts`
or `externally_connectable`. `scripts/validate-build.mjs` fails any build that does, or that
requests a permission outside the allowlist above. Widening the allowlist requires updating
this document first.

The end-to-end test build (`dist-e2e/`) adds `http://127.0.0.1/*` so Playwright can scan the
local fixture server. It is built to a separate folder, and the validator rejects it, so it
cannot be released by mistake.

## Data handling

- Nothing leaves the browser. SiteCheck makes no network requests and has no analytics.
- Scan results are kept in `chrome.storage.session`: Chrome clears it when the browser
  closes, and SiteCheck removes a tab's entry when the tab closes. Page scripts and content
  scripts cannot read it.
- Stored page URLs keep only origin and path. Query strings, fragments and embedded
  credentials, which can carry tokens, are dropped before storage.
- Each finding keeps at most 50 elements, with HTML snippets cut to 300 characters.
- Logs contain error codes only, never page content or URLs.
- Exports are created in the popup and saved through the browser's own download, with no
  `downloads` permission and no upload. They contain page content (HTML snippets, selectors)
  and the page URL without its query string, so treat exported files as you would the page.

The CSV protection's known trade-off: a cell that legitimately begins with `-` or `+` (such as
`-5`) is exported as `'-5`. Correctness of a spreadsheet formula is never worth the risk.

## Threat model (summary)

| Threat                                       | Control                                                                                                                   | Status |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| Page content rendered as HTML (XSS in popup) | React text nodes only; ESLint bans `dangerouslySetInnerHTML` and `innerHTML` assignment; component test SC-UI-004         | Active |
| `javascript:` or other unsafe help links     | Only `https:` help URLs survive normalization and validation                                                              | Active |
| Spoofed extension messages                   | Accepted only from SiteCheck's own extension pages (id and URL checked); other extensions and content scripts are ignored | Active |
| Malformed messages or scanner output         | Runtime guards on every message and on the scanner result; stored state is re-validated when read                         | Active |
| Page-derived selectors used for highlighting | Passed to the page as serialized `args` and used only with `querySelector`; invalid ones report "not found" (SC-UI-005)   | Active |
| Help links opening attacker-controlled pages | `https:` only, opened with `rel="noopener noreferrer"`                                                                    | Active |
| Page tampering with the scanner              | The scanner runs in the extension's isolated world, out of reach of page scripts                                          | Active |
| Remote or dynamic code                       | Default MV3 CSP; build validator rejects CSP loosening; ESLint bans `eval`; axe-core is bundled, never fetched            | Active |
| Over-broad access                            | `activeTab` only, enforced by the build validator                                                                         | Active |
| Secrets in the package                       | Build validator rejects `.pem`, `.crx` and `.env` files                                                                   | Active |
| Compromised CI dependency                    | `npm ci` from the lockfile; exact dependency versions; actions pinned to commit SHAs; read-only token                     | Active |
| Spreadsheet formula injection in CSV exports | Cells starting with `=`, `+`, `-`, `@`, tab or carriage return get a leading `'` (OWASP); every field quoted (SC-SEC-002) | Active |
| Unsafe characters in download file names     | Host reduced to `a-z 0-9 . -`, capped at 60 characters; fixed `sitecheck-…` prefix (SC-UNIT-015)                          | Active |

## Security review (Milestone 7, 2026-10-10)

What was checked, and the evidence:

| Area                         | Finding                                                                                                                                                                                                                            | Evidence                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Network                      | Scanning, highlighting and exporting make **no network requests**.                                                                                                                                                                 | SC-SEC-003 records every request during a full session; a positive control proves the recorder works                                               |
| axe-core stylesheet download | axe can re-fetch page stylesheets for a few CSS rules (`preload`). Now explicitly off.                                                                                                                                             | `src/scanner/entry.ts`; SC-SEC-003                                                                                                                 |
| Dynamic code in our bundles  | None. The popup's only `fetch` was Vite's module-preload polyfill, now disabled.                                                                                                                                                   | `validate-build.mjs` fails any build whose popup or worker contains `eval`, `new Function`, `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon` |
| Dynamic code in axe-core     | axe contains `new Function` (templates, plugin loading) in paths SiteCheck does not use. Chrome blocks string evaluation in the scanner's isolated world, so they could not run anyway.                                            | SC-SEC-004 gets `EvalError` from that world                                                                                                        |
| Content Security Policy      | Chrome's default also trusts `http://localhost:*` and `http://127.0.0.1:*`. SiteCheck now declares `script-src 'self'; object-src 'self'`, and the validator requires it.                                                          | SC-UNIT-001, SC-UNIT-002, SC-SEC-005                                                                                                               |
| Dependencies                 | `npm audit`: 0 vulnerabilities. Every version pinned exactly; `fflate` added for packaging only (build time, not shipped).                                                                                                         | `package.json`, `package-lock.json`                                                                                                                |
| CI and release               | Third-party actions pinned to commit SHAs; read-only token except the release job's `contents: write`; tag and version taken from environment variables, never interpolated into scripts. `actionlint` 1.7.12 reports no problems. | `.github/workflows/`                                                                                                                               |
| Packaging                    | The store zip is built only from a validated build, leaves out source maps, and is reproducible (identical bytes from the same commit) with a SHA-256 checksum.                                                                    | SC-UNIT-016; CI's checksum step                                                                                                                    |

## Pre-release security checklist

Run through this before every tag; record anything unusual in the release notes.

- [ ] `npm audit` reports no known vulnerabilities, or each is assessed and noted.
- [ ] The permissions table above still matches `manifest.config.ts`; no new permission or
      host access without updating this document first.
- [ ] `npm run validate:build` passes (permissions, CSP, forbidden code, secrets).
- [ ] The full CI pipeline passed on the commit being tagged.
- [ ] The regression suite's expected files are unchanged, or every change was reviewed.
- [ ] No secrets, keys or `.env` files in the repository or package
      (`git ls-files | grep -iE '\.(pem|crx|env)$'` prints nothing).
- [ ] Manual checks SC-MAN-001 and SC-MAN-002 done on the release build in desktop Chrome.
- [ ] The Chrome Web Store listing's privacy answers still match "Data handling" above.

## Known risks

- Chrome reports injection failures only as message text, which SiteCheck classifies by
  pattern. If Chrome rewords a message, the user sees the generic "scan failed" text rather
  than the specific one. Nothing unsafe follows from a misclassification.
