import { useState } from 'react';
import { toCsv } from '../../reports/exporters/csv';
import { toJson } from '../../reports/exporters/json';
import { reportFilename } from '../../reports/filename';
import type { ScanResult } from '../../shared/types/scan';

interface Props {
  result: ScanResult;
}

const FORMATS = {
  json: { label: 'Download JSON', type: 'application/json', build: toJson },
  csv: { label: 'Download CSV', type: 'text/csv', build: toCsv },
} as const;

type Format = keyof typeof FORMATS;

/**
 * Saves the report through a temporary Blob link, which needs no extension
 * permission (chrome.downloads would add a "downloads" permission warning).
 * Nothing leaves the browser.
 */
function download(content: string, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Give the browser a moment to start the download before freeing the data.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function ExportControls({ result }: Props) {
  const [message, setMessage] = useState<string | null>(null);

  const exportAs = (format: Format) => {
    const { type, build } = FORMATS[format];
    const now = new Date();
    try {
      const content = build(result, {
        toolVersion: chrome.runtime.getManifest().version,
        generatedAt: now,
      });
      const filename = reportFilename(result.pageUrl, now, format);
      download(content, type, filename);
      setMessage(`Saved ${filename}.`);
    } catch {
      setMessage('The report could not be created. Please try again.');
    }
  };

  return (
    <section aria-labelledby="export-heading" className="flex flex-col gap-2">
      <h2 id="export-heading" className="text-base font-semibold">
        Export
      </h2>
      <p className="text-xs text-slate-700 dark:text-slate-300">
        Reports include every finding, whatever the filters show.
      </p>
      <div className="flex gap-2">
        {(Object.keys(FORMATS) as Format[]).map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => {
              exportAs(format);
            }}
            className="rounded border border-blue-700 px-3 py-1 text-sm text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-blue-300 dark:text-blue-200 dark:hover:bg-slate-700"
          >
            {FORMATS[format].label}
          </button>
        ))}
      </div>
      <div role="status" aria-live="polite" aria-label="Export status" className="text-xs">
        {message}
      </div>
    </section>
  );
}
