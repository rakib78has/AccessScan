# Security and privacy

## Permissions

| Permission  | Why                                              | Since |
| ----------- | ------------------------------------------------ | ----- |
| _(none)_    | Milestone 1 only renders the popup               | M1    |
| `activeTab` | Temporary access to the tab the user clicked on  | M2    |
| `scripting` | Inject the scanner into that tab                 | M2    |
| `storage`   | Keep the last result per tab (`storage.session`) | M2    |

SiteCheck never declares `host_permissions`, `optional_host_permissions`, `content_scripts`
or `externally_connectable`. `scripts/validate-build.mjs` fails any build that does, or that
requests a permission outside the allowlist above. Widening the allowlist requires updating
this document first.

## Data handling

- Nothing leaves the browser. SiteCheck makes no network requests and has no analytics.
- From Milestone 2, scan results are kept in `chrome.storage.session`, which Chrome clears
  when the browser closes. HTML snippets are truncated before storage.

## Threat model (summary)

| Threat                                       | Control                                                                                 | Status |
| -------------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| Page content rendered as HTML (XSS in popup) | React text nodes only; ESLint bans `dangerouslySetInnerHTML` and `innerHTML` assignment | Active |
| Remote or dynamic code                       | Default MV3 CSP; build validator rejects CSP loosening; ESLint bans `eval`              | Active |
| Over-broad access                            | `activeTab` only, enforced by the build validator                                       | Active |
| Secrets in the package                       | Build validator rejects `.pem`, `.crx` and `.env` files                                 | Active |
| Compromised CI dependency                    | `npm ci` from the lockfile; actions pinned to commit SHAs; read-only token              | Active |
| Spoofed or malformed extension messages      | Runtime type guards and a `sender.id` check on every message                            | M2     |
| Spreadsheet formula injection in CSV exports | Cells starting with `=`, `+`, `-`, `@`, tab or carriage return are neutralized          | M5     |
