import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { MINIMUM_CHROME_VERSION } from './manifest.config.ts';
import { noticesPlugin } from './vite.notices.ts';

const root = import.meta.dirname;

/**
 * Builds the scanner injected into pages. `executeScript({ files })` runs a
 * classic script, not an ES module, so this must be one self-contained IIFE
 * with axe-core bundled in: no imports, and no remotely hosted code.
 */
export default defineConfig(({ mode }) => ({
  // The scanner bundles axe-core (MPL-2.0), so it carries its own notices file.
  plugins: [noticesPlugin('THIRD_PARTY_NOTICES_SCANNER.txt')],
  build: {
    outDir: resolve(root, mode === 'e2e' ? 'dist-e2e' : 'dist'),
    emptyOutDir: false, // runs after the main build, into the same folder
    target: `chrome${MINIMUM_CHROME_VERSION}`,
    minify: false,
    sourcemap: true,
    lib: {
      entry: resolve(root, 'src/scanner/entry.ts'),
      formats: ['iife'],
      name: 'SiteCheckScanner',
      fileName: () => 'scanner.js',
    },
  },
}));
