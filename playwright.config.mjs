import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:3100', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) },
  reporter: [['list'], ['html', { open: 'never' }]], outputDir: 'test-results'
});
