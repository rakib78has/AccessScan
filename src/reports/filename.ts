/**
 * Builds a download name such as `sitecheck-example.com-20261010-1430.csv`.
 * The host comes from page data, so everything outside a small safe set is
 * replaced: no path separators, control characters or reserved names reach
 * the file system.
 */
export function reportFilename(pageUrl: string, date: Date, extension: 'json' | 'csv'): string {
  let host = 'page';
  try {
    const url = new URL(pageUrl);
    host = url.protocol === 'file:' ? 'local-file' : url.hostname || 'page';
  } catch {
    // Keep the generic name.
  }
  const safeHost =
    host
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-')
      .replace(/^[.-]+|[.-]+$/g, '')
      .slice(0, 60) || 'page';

  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${String(date.getFullYear())}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `sitecheck-${safeHost}-${stamp}.${extension}`;
}
