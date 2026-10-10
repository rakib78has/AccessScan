import { describe, expect, it } from 'vitest';
import { reportFilename } from '../../src/reports/filename';

// Local time, since the name uses the user's clock.
const date = new Date(2026, 0, 5, 9, 7);

describe('SC-UNIT-015 report file names', () => {
  it.each([
    ['https://www.Example.com/path?q=1', 'sitecheck-www.example.com-20260105-0907.csv'],
    ['http://127.0.0.1:4173/clean.html', 'sitecheck-127.0.0.1-20260105-0907.csv'],
    ['file:///C:/site/index.html', 'sitecheck-local-file-20260105-0907.csv'],
    ['https://xn--caf-dma.example/', 'sitecheck-xn--caf-dma.example-20260105-0907.csv'],
    ['not a url', 'sitecheck-page-20260105-0907.csv'],
    ['about:blank', 'sitecheck-page-20260105-0907.csv'],
    ['http://_/', 'sitecheck-page-20260105-0907.csv'],
    ['', 'sitecheck-page-20260105-0907.csv'],
  ])('names a report for %j as %s', (url, expected) => {
    expect(reportFilename(url, date, 'csv')).toBe(expected);
  });

  it('only ever contains safe characters', () => {
    for (const url of ['https://[::1]/', 'https://a..b/', 'https://' + 'x'.repeat(200) + '.com/']) {
      const name = reportFilename(url, date, 'json');
      expect(name).toMatch(/^sitecheck-[a-z0-9][a-z0-9.-]*-\d{8}-\d{4}\.json$/);
      expect(name.length).toBeLessThan(100);
    }
  });
});
