# Test case register

Status reflects the most recent local run (Windows 11, Node 24.20, Playwright Chromium for
1.64). CI status is not recorded until the repository is on GitHub and a workflow run has
actually completed.

| ID          | Module          | Title                                                                   | Automated | Last run   | Status  |
| ----------- | --------------- | ----------------------------------------------------------------------- | --------- | ---------- | ------- |
| SC-UNIT-001 | Manifest        | MV3, versioned, exact permissions; host access only in the e2e build    | Yes       | 2026-10-10 | Pass    |
| SC-UNIT-002 | Build validator | Rejects forbidden keys, permissions, CSP, files, missing scanner, drift | Yes       | 2026-10-10 | Pass    |
| SC-UNIT-003 | URL handling    | Scannable vs restricted pages; file access; URL redaction               | Yes       | 2026-10-10 | Pass    |
| SC-UNIT-004 | Normalizer      | axe output to findings: outcomes, ordering, tags, caps, truncation      | Yes       | 2026-10-10 | Pass    |
| SC-UNIT-005 | Guards          | Rejects malformed messages, results and unsafe help URLs                | Yes       | 2026-10-10 | Pass    |
| SC-UNIT-006 | Errors          | Classifies Chrome injection errors; every code has a message            | Yes       | 2026-10-10 | Pass    |
| SC-UNIT-007 | Storage         | Round-trips state; rejects corrupt or outdated stored data; staleness   | Yes       | 2026-10-10 | Pass    |
| SC-UNIT-008 | Popup state     | Hides results from another page and orphaned running states             | Yes       | 2026-10-10 | Pass    |
| SC-INT-001  | Orchestrator    | Successful scan: running, then result stored, tab watch released        | Yes       | 2026-10-10 | Pass    |
| SC-INT-002  | Orchestrator    | Restricted pages, file access, missing tab, hidden URL, no grant        | Yes       | 2026-10-10 | Pass    |
| SC-INT-003  | Orchestrator    | Timeout, navigation (late result ignored), closed tab, removed frame    | Yes       | 2026-10-10 | Pass    |
| SC-INT-004  | Orchestrator    | Invalid scanner output rejected; logs carry codes, not page content     | Yes       | 2026-10-10 | Pass    |
| SC-INT-005  | Orchestrator    | Busy tab refused; orphaned scan replaced; rescans; tabs kept apart      | Yes       | 2026-10-10 | Pass    |
| SC-INT-006  | Orchestrator    | Storage failure is logged, not an unhandled rejection                   | Yes       | 2026-10-10 | Pass    |
| SC-INT-007  | Messaging       | Only SiteCheck's pages may start scans; malformed messages ignored      | Yes       | 2026-10-10 | Pass    |
| SC-UI-001   | Popup           | Shows the product heading and the automation disclaimer                 | Yes       | 2026-10-10 | Pass    |
| SC-UI-002   | Popup           | No axe violations, idle and with results (jsdom, no contrast)           | Yes       | 2026-10-10 | Pass    |
| SC-UI-003   | Popup           | Scan request, progress, results, errors, keyboard operation             | Yes       | 2026-10-10 | Pass    |
| SC-UI-004   | Popup           | Reopening shows stored state; page text never rendered as markup        | Yes       | 2026-10-10 | Pass    |
| SC-E2E-001  | Extension       | Service worker registers; popup renders with no errors                  | Yes       | 2026-10-10 | Pass    |
| SC-E2E-002  | Popup           | No axe violations including contrast, light and dark themes             | Yes       | 2026-10-10 | Pass    |
| SC-E2E-003  | Scan            | Finds the four known violations by element; stores no query string      | Yes       | 2026-10-10 | Pass    |
| SC-E2E-004  | Scan            | Clean page has no violations                                            | Yes       | 2026-10-10 | Pass    |
| SC-E2E-005  | Scan            | Repeated scans give identical findings                                  | Yes       | 2026-10-10 | Pass    |
| SC-E2E-006  | Scan            | Browser pages (`chrome://`) give a clear explanation                    | Yes       | 2026-10-10 | Pass    |
| SC-E2E-007  | Scan            | Cross-origin frame: scan finishes and flags the frame for review        | Yes       | 2026-10-10 | Pass    |
| SC-E2E-008  | Scan            | Navigating mid-scan never shows a result for the wrong page             | Yes       | 2026-10-10 | Pass    |
| SC-MAN-001  | Extension       | Loads unpacked in desktop Chrome; popup opens from the toolbar          | No        | n/a        | Not run |
| SC-MAN-002  | Scan            | Real `activeTab` flow: scan a public site after clicking the icon       | No        | n/a        | Not run |

The SC-E2E-003 to 008 scan specs also passed 30 of 30 runs with `--repeat-each=5`.

## Details

**SC-UNIT-002**: Data: the manifest from `buildManifest`, with one override per case.
Expected: the release manifest is accepted; each of `host_permissions` (including the e2e
manifest), `optional_host_permissions`, `content_scripts`, `externally_connectable`, a `tabs`
permission, an `unsafe-eval` CSP, a version mismatch, a missing referenced file, a missing
`scanner.js`, and a `.pem`, `.crx` or `.env` file is reported.

**SC-E2E-002**: Steps: open the popup page with the colour scheme emulated, inject axe-core
over DevTools, run all rules. Expected: no violations, and `color-contrast` appears among the
_passed_ rules, which proves it was evaluated rather than skipped.

**SC-E2E-003**: Data: `violations.html?token=secret#frag`. Expected: the popup shows 4
violations; stored findings are exactly `image-alt` on `#missing-alt` (not `#decorative`),
`label` on `#unlabeled`, `color-contrast` on `#low-contrast` and `link-name` on `#empty-link`;
the stored result does not contain `secret`.

**SC-E2E-008**: Steps: scan `large.html`, navigate to `clean.html` while the scan runs, reopen
the popup. Expected: the first popup returns to an idle or error state, and the reopened popup
shows no results. Which of "abandoned" or "finished for the old page" occurs depends on
timing; both are correct.

**SC-MAN-001**: Steps: build, load `dist/` unpacked in desktop Chrome, pin the extension,
click its icon. Expected: the popup opens showing the heading and the disclaimer, and the
extension card shows no errors.

**SC-MAN-002**: Preconditions: `dist/` loaded unpacked (not `dist-e2e/`). Steps: open any
public website, click the SiteCheck icon, press **Scan this page**; close and reopen the
popup; open `chrome://settings` and repeat. Expected: results appear and survive reopening the
popup; the settings page shows the "Chrome does not let extensions scan this kind of page"
message; the extension card shows no errors.
