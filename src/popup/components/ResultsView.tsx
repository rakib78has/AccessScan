import type { ScanResult } from '../../shared/types/scan';
import { useHighlight } from '../hooks/useHighlight';
import { ErrorBoundary } from './ErrorBoundary';
import { FindingsPanel } from './FindingsPanel';
import { ScanSummary } from './ScanSummary';

interface Props {
  tabId: number;
  result: ScanResult;
}

export function ResultsView({ tabId, result }: Props) {
  const { highlight, message } = useHighlight(tabId);

  return (
    // Keyed by scan time, so a new scan clears a previous rendering failure and filters.
    <ErrorBoundary key={result.scannedAt}>
      <ScanSummary result={result} />
      <FindingsPanel result={result} onHighlight={highlight} highlightMessage={message} />
    </ErrorBoundary>
  );
}
