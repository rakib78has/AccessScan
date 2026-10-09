import { describe, expect, it } from 'vitest';
import {
  SCAN_ERROR_CODES,
  classifyInjectionError,
  scanErrorMessage,
} from '../../src/shared/errors';

describe('SC-UNIT-006 classifyInjectionError', () => {
  // Messages as Chrome reports them from chrome.scripting.executeScript.
  it.each([
    ['Cannot access a chrome:// URL', 'restricted-page'],
    ['Cannot access a chrome-extension:// URL of different extension', 'restricted-page'],
    ['The extensions gallery cannot be scripted.', 'restricted-page'],
    [
      'Cannot access contents of url "data:text/html,hi". Extension manifest must request permission to access this host.',
      'restricted-page',
    ],
    [
      'Cannot access contents of url "https://example.com/". Extension manifest must request permission to access this host.',
      'no-access',
    ],
    ['Missing host permission for the tab', 'no-access'],
    ['Frame with ID 0 was removed.', 'navigated'],
    ['No frame with id 0 in tab 12.', 'navigated'],
    [
      'Axe is already running. Use `await axe.run()` to wait for the previous run to finish',
      'scan-failed',
    ],
    ['something else entirely', 'scan-failed'],
  ])('classifies "%s" as %s', (message, expected) => {
    expect(classifyInjectionError(new Error(message))).toBe(expected);
  });

  it('accepts non-Error values', () => {
    expect(classifyInjectionError('Missing host permission for the tab')).toBe('no-access');
    expect(classifyInjectionError(undefined)).toBe('scan-failed');
  });
});

describe('SC-UNIT-006 scanErrorMessage', () => {
  it('has a non-empty message for every error code', () => {
    for (const code of SCAN_ERROR_CODES) {
      expect(scanErrorMessage(code).length).toBeGreaterThan(10);
    }
  });
});
