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
| Spreadsheet formula injection in CSV exports | Cells starting with `=`, `+`, `-`, `@`, tab or carriage return are neutralized                                            | M5     |

## Known risks

- Chrome reports injection failures only as message text, which SiteCheck classifies by
  pattern. If Chrome rewords a message, the user sees the generic "scan failed" text rather
  than the specific one. Nothing unsafe follows from a misclassification.
