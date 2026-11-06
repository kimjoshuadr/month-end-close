import { expect, test } from '@playwright/test';
import { hasKey, loadSample } from './helpers';

// R17 with key: real answer mentions Green Valley. Runs only with DEEPSEEK_API_KEY.
test('R17 @ai answers from the close context', async ({ page }) => {
  test.skip(!hasKey(), 'no DEEPSEEK_API_KEY');
  await loadSample(page);
  await page.goto('/entries');
  await page.getByRole('button', { name: /ask ai/i }).click();
  await page.getByRole('textbox', { name: /ask ai/i }).fill("Why wasn't Green Valley booked?");
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(/green valley/i).nth(1)).toBeVisible({ timeout: 45000 });
  const first = page.locator('.msg.assistant').first();
  const tag = await first.evaluate((el) => el.innerHTML);
  expect(tag).toMatch(/<(strong|li|table)/);
  expect(tag).not.toContain('**');
  expect(tag.toLowerCase()).not.toContain('json');
});

// R17 without key: clear disabled state, no crash.
test('R17 disabled state without a key', async ({ page }) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false }) })
  );
  await loadSample(page);
  await page.goto('/entries');
  await page.getByRole('button', { name: /ask ai/i }).click();
  await expect(page.getByText(/disabled.*no.*key|no.*DEEPSEEK_API_KEY/i).first()).toBeVisible();
});
