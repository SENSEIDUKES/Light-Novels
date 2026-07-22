import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // This suite contains many jsdom-heavy component files. Bounding workers
    // avoids event-loop starvation that otherwise triggers false 5s timeouts
    // on high-core local/CI hosts while keeping file-level parallelism.
    maxWorkers: 4,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/server.ts', 'src/generated/**', '**/*.test.ts', '**/*.test.tsx', 'eslint.config.js', 'vitest.config.ts', 'playwright.config.ts'],
      // These floors preserve the legacy repository-wide CI baseline. The
      // phase-one foundation raises current coverage above them, but changing
      // the global coverage policy belongs in a separate, explicit cleanup.
      thresholds: {
        lines: 30,
        functions: 25,
        branches: 20,
        statements: 30
      }
    }
  },
});
