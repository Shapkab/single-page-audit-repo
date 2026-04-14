import { defineConfig } from 'playwright';

export default defineConfig({
  timeout: 30_000,
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: false,
  },
});
