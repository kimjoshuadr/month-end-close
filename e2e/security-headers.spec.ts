import { expect, test } from '@playwright/test';

// S6: lockdown headers ship in the production build.
test('S6 security headers are present', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  const h = res!.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['permissions-policy']).toContain('camera=()');
  expect(h['x-frame-options']).toBe('DENY');
  const csp = h['content-security-policy'] ?? '';
  for (const part of [
    "default-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "frame-ancestors 'none'",
  ]) {
    expect(csp, `csp contains ${part}`).toContain(part);
  }
  await expect(page.getByText('Month-End Close').first()).toBeVisible();
});
