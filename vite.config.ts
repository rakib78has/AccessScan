import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { MINIMUM_CHROME_VERSION, buildManifest } from './manifest.config.ts';

const root = import.meta.dirname;

function manifestPlugin(): Plugin {
  return {
    name: 'sitecheck-manifest',
    generateBundle() {
      const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
        version: string;
      };
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: `${JSON.stringify(buildManifest(pkg.version), null, 2)}\n`,
      });
    },
  };
}

/**
 * Builds the popup and the service worker. The Chrome version target matches
 * the manifest's minimum_chrome_version so no syntax is emitted that the
 * oldest supported Chrome cannot parse.
 */
export default defineConfig({
  root: resolve(root, 'src'),
  publicDir: resolve(root, 'public'),
  base: './',
  plugins: [react(), tailwindcss(), manifestPlugin()],
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    target: `chrome${MINIMUM_CHROME_VERSION}`,
    // Unminified output keeps Chrome Web Store review and debugging simple.
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(root, 'src/popup/index.html'),
        'service-worker': resolve(root, 'src/background/service-worker.ts'),
      },
      output: {
        // The manifest points at the worker by a fixed path, so it cannot be hashed.
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' ? 'service-worker.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
