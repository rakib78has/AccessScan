import { scanErrorMessage } from '../shared/errors';
import { ResultsView } from './components/ResultsView';
import { useScan, type PopupState } from './hooks/useScan';

export function App() {
  const { state, startScan } = useScan();
  const running = state.phase === 'running';
  const canScan = state.phase !== 'loading' && state.phase !== 'no-tab' && !running;

  return (
    <main className="flex flex-col gap-3 p-4">
      <header>
        <h1 className="text-lg font-semibold">SiteCheck</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Accessibility and SEO checks for the page you are viewing.
        </p>
      </header>

      <button
        type="button"
        onClick={startScan}
        disabled={!canScan}
        aria-busy={running}
        className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-slate-500 dark:focus-visible:outline-blue-300"
      >
        {running ? 'Scanning…' : 'Scan this page'}
      </button>

      {/* Announces progress and errors to screen readers without moving focus. */}
      <div role="status" aria-live="polite" aria-label="Scan status" className="text-sm">
        <StatusMessage state={state} />
      </div>

      {/* Kept above the results so a long list can never push it out of sight. */}
      <p
        className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        data-testid="automation-disclaimer"
      >
        Automated checks find only some accessibility problems. A clean result does not mean a page
        meets WCAG; manual testing with a keyboard and a screen reader is still needed.
      </p>

      {state.phase === 'done' && <ResultsView tabId={state.tabId} result={state.state.result} />}
    </main>
  );
}

function StatusMessage({ state }: { state: PopupState }) {
  switch (state.phase) {
    case 'running':
      return <span>Scanning this page…</span>;
    case 'done':
      return <span>Scan complete.</span>;
    case 'error':
      return (
        <span className="text-red-700 dark:text-red-300" data-testid="scan-error">
          {scanErrorMessage(state.error)}
        </span>
      );
    case 'no-tab':
      return <span>Open a web page, then scan it.</span>;
    case 'loading':
    case 'idle':
      return null;
  }
}
