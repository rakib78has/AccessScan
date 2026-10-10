import { describe, expect, it } from 'vitest';
import { formatWcagTags } from '../../src/popup/wcag';

describe('SC-UNIT-010 formatWcagTags', () => {
  it('formats success criteria, including two-digit ones', () => {
    expect(formatWcagTags(['wcag111', 'wcag143', 'wcag1411', 'wcag412']).criteria).toEqual([
      '1.1.1',
      '1.4.3',
      '1.4.11',
      '4.1.2',
    ]);
  });

  it('formats conformance levels across WCAG versions', () => {
    expect(
      formatWcagTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'wcag2aaa']).levels,
    ).toEqual(['WCAG 2.0 A', 'WCAG 2.0 AA', 'WCAG 2.1 AA', 'WCAG 2.2 AA', 'WCAG 2.0 AAA']);
  });

  it('ignores tags it does not recognise', () => {
    expect(formatWcagTags(['best-practice', 'wcag', 'wcag2x', 'section508'])).toEqual({
      criteria: [],
      levels: [],
    });
  });
});
