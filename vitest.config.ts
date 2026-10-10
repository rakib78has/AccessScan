import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['tests/component/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/helpers/setup-dom.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs', 'manifest.config.ts'],
      reporter: ['text', 'html', 'lcov'],
      // Floors for the modules holding scan logic and trust-boundary checks.
      // Chrome-bound glue (adapter, worker, scanner entry) is covered by the
      // end-to-end suite instead, which Vitest coverage cannot see.
      thresholds: {
        'src/background/scan-orchestrator.ts': { lines: 90, branches: 90 },
        'src/background/message-handler.ts': { lines: 90, branches: 90 },
        'src/messaging/**': { lines: 90, branches: 90 },
        'src/scanner/accessibility/**': { lines: 90, branches: 90 },
        'src/scanner/seo/**': { lines: 90, branches: 90 },
        'src/scanner/combine.ts': { lines: 90, branches: 90 },
        'src/storage/**': { lines: 90, branches: 90 },
        'src/shared/**': { lines: 90, branches: 90 },
        'src/content/**': { lines: 90, branches: 90 },
        'src/popup/filters.ts': { lines: 90, branches: 90 },
        'src/popup/wcag.ts': { lines: 90, branches: 90 },
      },
    },
  },
});
