import { describe, expect, it } from 'vitest';
import { CSV_COLUMNS, csvCell, toCsv } from '../../src/reports/exporters/csv';
import { parseCsv } from '../helpers/csv-parse';
import { makeFinding, makeScanResult } from '../helpers/scan-data';

const context = { toolVersion: '0.1.0', generatedAt: new Date('2026-10-10T12:00:00Z') };

function exportRows(result = makeScanResult()) {
  const csv = toCsv(result, context);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  // Drop the BOM, then the blank line and disclaimer row at the end.
  const rows = parseCsv(csv.slice(1));
  return { csv, header: rows[0], data: rows.slice(1, -2), footer: rows.slice(-2) };
}

describe('SC-SEC-002 CSV formula injection', () => {
  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx', '=HYPERLINK("http://evil","click")'])(
    'neutralizes a cell starting %j with a leading apostrophe',
    (value) => {
      const [[cell]] = parseCsv(`${csvCell(value)}\r\n`) as [[string]];
      expect(cell).toBe(`'${value}`);
    },
  );

  it.each(['plain text', '<img src=x>', 'a=b', ' =1+1', '1+1', '#target'])(
    'leaves %j as it is',
    (value) => {
      const [[cell]] = parseCsv(`${csvCell(value)}\r\n`) as [[string]];
      expect(cell).toBe(value);
    },
  );

  it('neutralizes formulas in page-derived columns of a real export', () => {
    const finding = makeFinding({
      nodes: [{ target: '=cmd|"/c calc"!A1', html: '@evil', failureSummary: '-2+3' }],
    });
    const { data } = exportRows(makeScanResult({ findings: [finding] }));
    const [row] = data;
    expect(row?.[CSV_COLUMNS.indexOf('Element')]).toBe(`'=cmd|"/c calc"!A1`);
    expect(row?.[CSV_COLUMNS.indexOf('HTML')]).toBe("'@evil");
    expect(row?.[CSV_COLUMNS.indexOf('Failure summary')]).toBe("'-2+3");
  });
});

describe('SC-UNIT-013 CSV export', () => {
  it('writes a well-formed file: BOM, quoted fields, CRLF rows, header first', () => {
    const { csv, header } = exportRows();
    expect(header).toEqual([...CSV_COLUMNS]);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('writes one row per affected element', () => {
    const finding = makeFinding({
      nodeCount: 2,
      nodes: [
        { target: '#a', html: '<img id="a">', failureSummary: 'Fix a' },
        { target: '#b', html: '<img id="b">', failureSummary: 'Fix b' },
      ],
    });
    const { data } = exportRows(makeScanResult({ findings: [finding] }));
    expect(data.map((r) => r[CSV_COLUMNS.indexOf('Element')])).toEqual(['#a', '#b']);
    expect(data[0]).toEqual([
      'Accessibility',
      'Violation',
      'critical',
      'image-alt',
      'Images must have alternative text',
      'Ensures <img> elements have alternative text',
      'wcag2a wcag111',
      '#a',
      '<img id="a">',
      'Fix a',
      'https://dequeuniversity.com/rules/axe/4.14/image-alt',
      'https://example.com/page',
      '2026-10-10T12:00:00.000Z',
    ]);
  });

  it('writes one "Whole page" row for a finding with no elements', () => {
    const finding = makeFinding({
      source: 'seo',
      ruleId: 'seo-viewport-missing',
      outcome: 'needs-review',
      impact: null,
      helpUrl: null,
      wcagTags: [],
      nodeCount: 0,
      nodes: [],
    });
    const [row] = exportRows(makeScanResult({ findings: [finding] })).data;
    expect(row?.slice(0, 4)).toEqual(['SEO', 'Needs review', 'unrated', 'seo-viewport-missing']);
    expect(row?.[CSV_COLUMNS.indexOf('Element')]).toBe('Whole page');
    expect(row?.[CSV_COLUMNS.indexOf('Help URL')]).toBe('');
  });

  it('keeps quotes, commas, line breaks and non-ASCII text intact', () => {
    const tricky = 'Say "hi", then\r\nleave. Café 漢字';
    const finding = makeFinding({ nodes: [{ target: '#x', html: tricky, failureSummary: '' }] });
    const [row] = exportRows(makeScanResult({ findings: [finding] })).data;
    expect(row?.[CSV_COLUMNS.indexOf('HTML')]).toBe(tricky);
  });

  it('exports only a header and the disclaimer when there are no findings', () => {
    const { data, footer } = exportRows(makeScanResult({ findings: [] }));
    expect(data).toEqual([]);
    expect(footer[1]?.[0]).toContain('does not mean the page meets WCAG');
    expect(footer[1]?.[0]).toContain('SiteCheck 0.1.0');
  });
});
