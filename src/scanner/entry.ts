import axe from 'axe-core';
import { redactUrl } from '../shared/url';
import { normalizeAxeResults } from './accessibility/normalize';
import { withSeoResults } from './combine';
import './global';
import { runSeoChecks } from './seo/seo-rules';

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
    // axe can re-download the page's stylesheets for a few CSS rules. SiteCheck
    // promises to make no network requests, so that is switched off explicitly.
    preload: false,
  });
  // The full URL is used only to resolve canonical links; it is never stored.
  const seo = runSeoChecks(document, location.href);
  const accessibility = normalizeAxeResults(results, {
    pageUrl: redactUrl(location.href),
    scannedAt,
    durationMs: performance.now() - started,
  });
  return withSeoResults(accessibility, seo);
};
