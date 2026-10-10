# Release process

## Versioning

SiteCheck follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **PATCH**: fixes with no change in what is reported, such as a crash fix.
- **MINOR**: new checks, new features, or changes in what existing checks report.
- **MAJOR**: changes to exported report formats (`reportSchemaVersion`) or to permissions.

Chrome requires plain dot-separated numbers, so there are no `-beta` style suffixes. The
version lives only in `package.json`; the manifest is generated from it.

## Cutting a release

1. Work on a branch as usual, then merge into `main` once CI is green.
2. On a new branch `release/vX.Y.Z`:
   - set `"version"` in `package.json` (and run `npm install` so the lockfile follows);
   - in `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD` and add a
     fresh empty `## [Unreleased]` above it.
3. Check it locally:

   ```sh
   npm run verify && npm run test:e2e
   npm run release:check -- vX.Y.Z
   npm run package          # writes release/sitecheck-X.Y.Z.zip and .sha256
   ```

4. Go through the [pre-release security checklist](security.md#pre-release-security-checklist),
   including the manual checks in desktop Chrome on the packaged build.
5. Merge the release branch into `main` and wait for CI.
6. Tag the merge commit and push the tag:

   ```sh
   git switch main && git pull
   git tag -a vX.Y.Z -m "SiteCheck X.Y.Z"
   git push origin vX.Y.Z
   ```

The **Release** workflow then:

1. checks that the tag matches `package.json` and that the changelog has a section for it;
2. runs the complete CI pipeline again on the tagged commit;
3. builds, validates and packages the extension, verifies the checksum, and creates a GitHub
   release with the zip, the checksum and the changelog section as notes.

Nothing is published if any step fails. A failed release leaves no GitHub release behind;
fix the problem, delete the tag (`git push origin :refs/tags/vX.Y.Z`), and tag again.

## Publishing to the Chrome Web Store

This stays manual and deliberate; no workflow holds store credentials.

1. Download `sitecheck-X.Y.Z.zip` from the GitHub release and check it against the
   `.sha256` file (`sha256sum --check sitecheck-X.Y.Z.zip.sha256`).
2. In the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole),
   upload the zip as a new version of the item.
3. Confirm the listing, permission justifications and privacy answers still match
   [security.md](security.md).
4. Submit for review.

## Rollback and recovery

The Chrome Web Store cannot reinstate an older version. To recover from a bad release:

1. Revert the faulty change on `main` (or fix it).
2. Release a **new, higher** version (for example `0.2.1` after a bad `0.2.0`) through the
   normal process. Users update automatically.
3. While a fix is prepared, the bad version can be unpublished from the dashboard so new users
   do not install it; existing installs keep it until the fix arrives.

Every GitHub release keeps its zip and checksum, so any earlier build can be inspected or
re-uploaded under a new version number. Builds are reproducible: checking out a tag and
running `npm ci && npm run build && npm run package` gives a byte-identical zip.
