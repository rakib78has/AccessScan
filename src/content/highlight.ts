/**
 * Runs inside the scanned page to point out one affected element.
 *
 * Chrome serializes this function into the page with
 * chrome.scripting.executeScript, so it must be entirely self-contained: no
 * imports, no references to anything outside its own body. The selector is
 * page-derived data and arrives as an argument, never as code.
 *
 * It scrolls the element into view and draws a temporary outline on a
 * separate overlay element, so the page's own elements and styles are never
 * modified. Inside an element that scrolls on its own, the overlay can drift if
 * that container is scrolled while it shows; it disappears after a few seconds.
 */

export type HighlightOutcome = 'shown' | 'not-found' | 'in-frame' | 'not-visible';

export const HIGHLIGHT_OVERLAY_ID = '__sitecheck-highlight';
export const HIGHLIGHT_DURATION_MS = 3000;

export function highlightElement(
  target: string,
  overlayId: string,
  durationMs: number,
): HighlightOutcome {
  // axe joins frame and shadow-root steps with " >>> ". Shadow roots can be
  // walked; frames cannot, because the scanner never ran inside them.
  const steps = target.split(' >>> ');
  let root: Document | ShadowRoot = document;
  let element: Element | null = null;

  for (const [index, step] of steps.entries()) {
    try {
      element = root.querySelector(step);
    } catch {
      return 'not-found'; // invalid selector
    }
    if (!element) return 'not-found';
    const isLast = index === steps.length - 1;
    if (!isLast) {
      if (element.tagName === 'IFRAME' || element.tagName === 'FRAME') return 'in-frame';
      if (!element.shadowRoot) return 'not-found';
      root = element.shadowRoot;
    }
  }
  if (!element) return 'not-found';

  document.getElementById(overlayId)?.remove();
  // 'instant' overrides any CSS smooth scrolling, so the measurement below is final.
  element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });

  // Document coordinates stay aligned with the element when the page scrolls.
  const rect = element.getBoundingClientRect();
  // Elements with no box (in <head>, display: none) cannot be pointed at.
  if (rect.width === 0 && rect.height === 0) return 'not-visible';
  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'absolute',
    top: `${String(rect.top + window.scrollY - 4)}px`,
    left: `${String(rect.left + window.scrollX - 4)}px`,
    width: `${String(rect.width + 8)}px`,
    height: `${String(rect.height + 8)}px`,
    border: '3px solid #c2185b',
    outline: '2px solid #ffffff',
    borderRadius: '4px',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    zIndex: '2147483647',
  });
  document.documentElement.append(overlay);
  setTimeout(() => {
    overlay.remove();
  }, durationMs);
  return 'shown';
}
