import axe from 'axe-core';
import { redactUrl } from '../shared/url';
import { normalizeAxeResults } from './accessibility/normalize';
import './global';

/** How long axe waits for an iframe to answer. Frames SiteCheck cannot access never will. */
const FRAME_WAIT_MS = 1000;

globalThis.__siteCheckScan = async () => {
  const started = performance.now();
  const scannedAt = new Date().toISOString();
  const results = await axe.run(document, {
    // Full node detail only where someone needs to act; passes are just counted.
    resultTypes: ['violations', 'incomplete'],
    iframes: true,
    frameWaitTime: FRAME_WAIT_MS,
  });
  return normalizeAxeResults(results, {
    pageUrl: redactUrl(location.href),
    scannedAt,
    durationMs: performance.now() - started,
  });
};
