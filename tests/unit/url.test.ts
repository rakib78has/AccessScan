import { describe, expect, it } from 'vitest';
import { checkScannableUrl, redactUrl } from '../../src/shared/url';

describe('SC-UNIT-003 checkScannableUrl', () => {
  it.each([
    'https://example.com/',
    'http://127.0.0.1:4173/page.html',
    'https://chrome.google.com/',
  ])('allows %s', (url) => {
    expect(checkScannableUrl(url, false)).toEqual({ scannable: true });
  });

  it.each([
    'chrome://settings',
    'chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html',
    'edge://settings',
    'about:blank',
    'view-source:https://example.com/',
    'devtools://devtools/bundled/inspector.html',
    'data:text/html,<p>hi</p>',
    'blob:https://example.com/0f6a',
    'javascript:alert(1)',
    'https://chromewebstore.google.com/detail/x',
    'https://chrome.google.com/webstore/detail/x',
    'not a url',
    '',
  ])('refuses %s as a restricted page', (url) => {
    expect(checkScannableUrl(url, true)).toEqual({ scannable: false, reason: 'restricted-page' });
  });

  it('refuses undefined', () => {
    expect(checkScannableUrl(undefined, true)).toEqual({
      scannable: false,
      reason: 'restricted-page',
    });
  });

  it('allows file URLs only when the user has granted file access', () => {
    expect(checkScannableUrl('file:///C:/site/index.html', true)).toEqual({ scannable: true });
    expect(checkScannableUrl('file:///C:/site/index.html', false)).toEqual({
      scannable: false,
      reason: 'file-access-disabled',
    });
  });
});

describe('SC-UNIT-003 redactUrl', () => {
  it('drops the query string and fragment, which can carry tokens', () => {
    expect(redactUrl('https://example.com/reset?token=secret#step2')).toBe(
      'https://example.com/reset',
    );
  });

  it('drops credentials embedded in the URL', () => {
    expect(redactUrl('https://user:pass@example.com/a')).toBe('https://example.com/a');
  });

  it('keeps the path of file URLs', () => {
    expect(redactUrl('file:///C:/site/index.html?x=1')).toBe('file:///C:/site/index.html');
  });

  it('returns an empty string for an unparseable URL', () => {
    expect(redactUrl('::nope')).toBe('');
  });
});
