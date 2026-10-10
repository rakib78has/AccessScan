import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportControls } from '../../src/popup/components/ExportControls';
import { makeScanResult } from '../helpers/scan-data';

let blobs: Blob[] = [];
let clicked: HTMLAnchorElement[] = [];
let revoke = vi.fn();

beforeEach(() => {
  blobs = [];
  clicked = [];
  vi.stubGlobal('chrome', { runtime: { getManifest: () => ({ version: '9.9.9' }) } });
  // jsdom implements neither object URLs nor downloads.
  URL.createObjectURL = vi.fn((blob: Blob) => {
    blobs.push(blob);
    return 'blob:fake';
  });
  revoke = vi.fn();
  URL.revokeObjectURL = revoke;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this);
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SC-UI-011 export controls', () => {
  it('downloads a JSON report named after the page', async () => {
    render(<ExportControls result={makeScanResult()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download JSON' }));

    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toMatch(/^sitecheck-example\.com-\d{8}-\d{4}\.json$/);
    expect(blobs[0]?.type).toBe('application/json;charset=utf-8');
    const report = JSON.parse(await (blobs[0] as Blob).text()) as { tool: { version: string } };
    expect(report.tool.version).toBe('9.9.9');
    expect(screen.getByRole('status', { name: 'Export status' })).toHaveTextContent(
      /^Saved sitecheck-example\.com-.*\.json\.$/,
    );
  });

  it('downloads a CSV report', async () => {
    render(<ExportControls result={makeScanResult()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(clicked[0]?.download).toMatch(/\.csv$/);
    expect(blobs[0]?.type).toBe('text/csv;charset=utf-8');
    expect(await (blobs[0] as Blob).text()).toContain('"Category","Outcome"');
  });

  it('frees the temporary download URL afterwards', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ExportControls result={makeScanResult()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:fake');
    vi.useRealTimers();
  });

  it('reports a failure instead of throwing', async () => {
    URL.createObjectURL = vi.fn(() => {
      throw new Error('quota');
    });
    render(<ExportControls result={makeScanResult()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    expect(screen.getByRole('status', { name: 'Export status' })).toHaveTextContent(
      'The report could not be created.',
    );
  });

  it('says that exports ignore the filters', () => {
    render(<ExportControls result={makeScanResult()} />);
    expect(screen.getByText(/whatever the filters show/)).toBeInTheDocument();
  });
});
