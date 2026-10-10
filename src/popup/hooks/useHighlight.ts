import { useCallback, useState } from 'react';
import {
  HIGHLIGHT_DURATION_MS,
  HIGHLIGHT_OVERLAY_ID,
  highlightElement,
  type HighlightOutcome,
} from '../../content/highlight';

const MESSAGES: Record<HighlightOutcome | 'failed', string> = {
  shown: 'Highlighted on the page.',
  'not-found': 'That element is no longer on the page. Scan again to refresh the results.',
  'in-frame': 'That element is inside a frame, which SiteCheck cannot highlight.',
  'not-visible':
    'That element is not displayed on the page (for example, it is in the page head or hidden).',
  failed: 'SiteCheck cannot reach this page. Click the SiteCheck icon on this tab again.',
};

/**
 * Highlights an affected element in the scanned tab. Runs straight from the
 * popup, which already holds the activeTab grant. The selector is page-derived,
 * so it is passed as an argument (serialized data), never built into code.
 */
export function useHighlight(tabId: number): {
  highlight: (target: string) => void;
  message: string | null;
} {
  const [message, setMessage] = useState<string | null>(null);

  const highlight = useCallback(
    (target: string) => {
      setMessage(null);
      chrome.scripting
        .executeScript({
          target: { tabId },
          func: highlightElement,
          args: [target, HIGHLIGHT_OVERLAY_ID, HIGHLIGHT_DURATION_MS],
        })
        .then(([injection]) => {
          setMessage(MESSAGES[injection?.result ?? 'failed']);
        })
        .catch(() => {
          setMessage(MESSAGES.failed);
        });
    },
    [tabId],
  );

  return { highlight, message };
}
