# Test case register

Status reflects the most recent local run. CI status is not recorded until the repository is
on GitHub and a workflow run has actually completed.

| ID          | Module          | Title                                                          | Automated | Last run   | Status  |
| ----------- | --------------- | -------------------------------------------------------------- | --------- | ---------- | ------- |
| SC-UNIT-001 | Manifest        | Manifest is MV3, versioned, requests no host access            | Yes       | 2026-10-10 | Pass    |
| SC-UNIT-002 | Build validator | Rejects forbidden keys, permissions, CSP, files, version drift | Yes       | 2026-10-10 | Pass    |
| SC-UI-001   | Popup           | Shows the product heading and the automation disclaimer        | Yes       | 2026-10-10 | Pass    |
| SC-UI-002   | Popup           | No axe violations in rendered markup (jsdom, no contrast)      | Yes       | 2026-10-10 | Pass    |
| SC-E2E-001  | Extension       | Service worker registers; popup renders with no errors         | Yes       | 2026-10-10 | Pass    |
| SC-E2E-002  | Popup           | No axe violations including contrast, light and dark themes    | Yes       | 2026-10-10 | Pass    |
| SC-MAN-001  | Extension       | Loads unpacked in desktop Chrome; popup opens from the toolbar | No        | n/a        | Not run |

## Details

**SC-UNIT-002**: Preconditions: none. Data: the manifest from `buildManifest`, with one
override per case. Expected: the generated manifest is accepted; each of `host_permissions`,
`optional_host_permissions`, `content_scripts`, `externally_connectable`, a `tabs`
permission, an `unsafe-eval` CSP, a version mismatch, a missing referenced file and a
`.pem`, `.crx` or `.env` file is reported.

**SC-E2E-002**: Preconditions: `dist/` is built. Steps: open the popup page with the colour
scheme emulated, inject axe-core over DevTools, run all rules. Expected: no violations, and
`color-contrast` appears among the _passed_ rules, which proves it was evaluated rather than
skipped.

**SC-MAN-001**: Steps: build, load `dist/` unpacked in desktop Chrome, pin the extension,
click its icon. Expected: the popup opens showing the heading and the disclaimer, and the
extension card shows no errors.
