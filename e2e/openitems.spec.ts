import { expect, test } from '@playwright/test';
import { loadSample, stripNI } from './helpers';

// R7: all seven flags listed with key evidence.
test('R7 worklist flags every unsettled item', async ({ page }) => {
  await loadSample(page);
  await page.goto('/open-items');
  const rows = page.locator('table.grid tbody tr');
  await expect(rows).toHaveCount(7);
  await expect(page.getByText('$5,000 transfer from ****4471 on 9/12').first()).toBeVisible();
  await page.getByRole('row', { name: /Accounts payable support/ }).click();
  await expect(page.getByText('9,490')).toBeVisible();
  await expect(page.getByRole('row', { name: /August payroll cutoff/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Northline/ })).toBeVisible();
});

// R8: typed reply maps to Loan; entry credits 2600 with the approval label.
test('R8 typed reply books the owner loan', async ({ page }) => {
  await loadSample(page);
  await page.goto('/open-items?sel=owner-transfer');
  await page.locator('#c-owner-transfer').fill('it was a loan');
  await page.getByRole('button', { name: 'Send' }).first().click();
  await expect(page.getByText('Matched').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('radio', { name: /loan from owner/i })).toBeChecked();
  await page.goto('/entries?sel=owner-transfer');
  await expect(page.getByText('2600').first()).toBeVisible();
  await expect(page.getByText(/requires approval/i).first()).toBeVisible();
});

// R9: revenue then back to contribution restores NI exactly.
test('R9 answers change and return cleanly', async ({ page }) => {
  await loadSample(page);
  await page.goto('/open-items?sel=owner-transfer');
  await page.getByRole('radio', { name: /already correct as revenue/i }).check();
  await page.getByRole('button', { name: 'Save answer' }).click();
  expect(await stripNI(page)).toBe('$29,697.50');
  await page.getByRole('row', { name: /\$5,000 transfer/ }).click();
  await page.getByRole('radio', { name: /capital contribution/i }).check();
  await page.getByRole('button', { name: 'Save answer' }).click();
  expect(await stripNI(page)).toBe('$24,697.50');
});
