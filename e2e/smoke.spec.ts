import { expect, test } from '@playwright/test';
import { loadSample, watchErrors } from './helpers';

// R1: every route serves, chrome clean, header visible.
for (const route of ['/', '/entries', '/open-items', '/statements', '/audit']) {
  test(`R1 route ${route} loads cleanly`, async ({ page }) => {
    const w = watchErrors(page);
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.getByText('Month-End Close').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    w.assertNone();
  });
}

// R16: session survives reload; Reset session clears.
test('R16 session persists across reload, reset clears', async ({ page }) => {
  watchErrors(page);
  await loadSample(page);
  await page.goto('/open-items');
  await page.getByRole('row', { name: /\$5,000 transfer/ }).click();
  await page.getByRole('radio', { name: /loan from owner/i }).check();
  await page.getByRole('button', { name: 'Save answer' }).click();
  await expect(page.getByText('1 of 7 resolved').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 of 7 resolved').first()).toBeVisible();
  await page.goto('/');
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /reset session/i }).click();
  await expect(page.getByText('No packet loaded')).toBeVisible();
});
