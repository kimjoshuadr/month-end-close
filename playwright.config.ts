import { defineConfig } from '@playwright/test';
import * as fs from 'fs';

// Reads the key for the test server only. Never logged or committed.
function loadKey(): string {
  for (const f of ['.env.local', '.env']) {
    if (fs.existsSync(f)) {
      const m = /^DEEPSEEK_API_KEY=(.+)$/m.exec(fs.readFileSync(f, 'utf8'));
      const v = (m?.[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
      if (v) return v;
    }
  }
  return '';
}

const key = loadKey();
// Set E2E_BASE_URL to test a deployed site instead of a local build.
const remote = process.env.E2E_BASE_URL;
if (!key) console.log('[e2e] no DEEPSEEK_API_KEY found; @ai live tests will be skipped');

export default defineConfig({
  testDir: 'e2e',
  timeout: 90000,
  workers: 3,
  reporter: [['list']],
  use: {
    baseURL: remote ?? 'http://localhost:3200',
    trace: 'retain-on-failure',
  },
  webServer: remote ? undefined : {
    command: 'npm run build && npx next start -p 3200',
    url: 'http://localhost:3200',
    timeout: 300000,
    reuseExistingServer: false,
    env: { ...process.env, ...(key ? { DEEPSEEK_API_KEY: key } : {}) } as Record<string, string>,
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 390, height: 844 } } },
    {
      name: 'reduced',
      use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 1440, height: 900 }, contextOptions: { reducedMotion: 'reduce' } },
      testMatch: [/smoke/, /openitems/, /interactions/],
    },
  ],
});
