# SiteCheck privacy policy

_Effective 10 October 2026._

SiteCheck is a browser extension that checks the web page you are viewing for common
accessibility and basic SEO issues. This policy explains what it does with information.

## Summary

SiteCheck does not collect, transmit, sell or share any personal data or browsing data.
Everything it does happens inside your browser.

## What SiteCheck reads

- **Only the page you ask it to check.** SiteCheck can read a page only after you click its
  toolbar icon on that tab and press **Scan this page**. It cannot read other tabs, other
  sites, or your browsing history.
- When you scan, it examines the page's content (for example image text alternatives, form
  labels, colours, headings, the page title and meta tags) to find issues.

## What SiteCheck stores

- The latest scan result for each tab is kept in the browser's session storage. It includes
  short excerpts of the page's markup for the issues found and the page address without its
  query string or fragment.
- This data stays on your device. Chrome deletes it when you close the browser, and
  SiteCheck deletes a tab's result when the tab is closed.

## What SiteCheck sends

Nothing. SiteCheck makes no network requests: no analytics, no tracking, no error reporting,
and no remote code. Its checking engine, axe-core, is included in the extension itself.

Each finding offers a "How to fix this" link to public documentation (for example Deque
University or Google Search Central). Those sites are contacted only if you click a link, which
opens in a new tab like any other link you follow.

## Reports you export

If you choose **Download JSON** or **Download CSV**, the report is saved to your device by
your browser like any other download. It contains the scan result described above. SiteCheck
never uploads it; what you do with the file is up to you.

## Permissions

| Permission  | Why SiteCheck needs it                                               |
| ----------- | -------------------------------------------------------------------- |
| `activeTab` | To read the one tab you clicked the SiteCheck icon on, and only then |
| `scripting` | To run the checks inside that tab                                    |
| `storage`   | To keep the latest result per tab for the browser session            |

## Changes

If this policy changes, the new version will be published at the same address with a new
effective date, and the change will be noted in the release notes.

## Contact

Questions or concerns: open an issue at
<https://github.com/rakib78has/AccessScan/issues>.
