import { expect, test } from '@playwright/test';
import { loadSample, stripNI } from './helpers';

// R11: all six reports render with acceptance figures.
test('R11 statements match file 03 format and figures', async ({ page }) => {
  await loadSample(page);
  await page.goto('/statements');
  for (const tab of ['Cover', 'Income Statement — month', 'Income Statement — YTD', 'Balance Sheet', 'Cash Flows', 'Trailing Twelve Months']) {
    await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Income Statement — month', exact: true }).click();
  const month = page.locator('.paper');
  await expect(month.getByRole('button', { name: /total sales.*91,500/i })).toBeVisible();
  await expect(month.getByRole('button', { name: /78,475/ })).toBeVisible();
  await page.getByRole('button', { name: 'Balance Sheet', exact: true }).click();
  await expect(page.locator('.paper').getByRole('button', { name: /231,120/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Cash Flows', exact: true }).click();
  const cf = page.locator('.paper');
  await expect(cf.getByRole('button', { name: /84,320/ }).first()).toBeVisible();
  await expect(cf.getByRole('button', { name: /59,900/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Income Statement — YTD', exact: true }).click();
  await expect(page.locator('.paper').getByRole('button', { name: /209,945/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /trailing twelve/i }).click();
  await expect(page.locator('.paper').getByRole('button', { name: /24,698/ }).first()).toBeVisible();
});

// R12: 2025 comparatives come from the August TTM Sep-25 column.
test('R12 prior-year column equals August Sep-25', async ({ page }) => {
  await loadSample(page);
  await page.goto('/statements');
  await page.getByRole('button', { name: 'Income Statement — month', exact: true }).click();
  await expect(page.locator('.paper').getByRole('button', { name: /56,312/ }).first()).toBeVisible();
});

// R13: draft ribbon, reviewer note in audit, final toggle, no outbound calls.
test('R13 draft, notes, final, and no outbound requests', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (/^https?:\/\//.test(url) && !/localhost|127\.0\.0\.1/.test(url)) external.push(url);
  });
  await loadSample(page);
  await page.goto('/statements');
  await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible();
  await page.locator('textarea[id^="notes-"]').first().fill('Reviewer checked NI tie-out.');
  await page.locator('.paper').click({ position: { x: 5, y: 5 } });
  await expect(page.getByText('Reviewer checked NI tie-out.')).toBeVisible();
  await page.goto('/audit');
  await expect(page.getByText(/Reviewer note saved/).first()).toBeVisible();
  await page.goto('/statements');
  await page.getByRole('button', { name: 'Mark as final' }).click();
  await page.getByRole('button', { name: 'Confirm final' }).click();
  await expect(page.getByText('Final', { exact: true }).first()).toBeVisible();
  expect(external).toEqual([]);
});

// R14: cutoff correction flows to statements, still balanced.
test('R14 aug cutoff correction updates statements', async ({ page }) => {
  await loadSample(page);
  await page.goto('/open-items?sel=aug-cutoff');
  await page.getByRole('radio', { name: /correct via retained earnings/i }).check();
  await page.getByRole('button', { name: 'Save answer' }).click();
  expect(await stripNI(page)).toBe('$25,715.00');
  await page.goto('/statements');
  await expect(page.locator('.strip').getByText('0.00', { exact: true })).toBeVisible();
});

// R15: drill-down from a statement figure.
test('R15 utilities drills to AJE-004 and Lakeside', async ({ page }) => {
  await loadSample(page);
  await page.goto('/statements');
  await page.getByRole('button', { name: 'Income Statement — month', exact: true }).click();
  await page.getByRole('button', { name: /drill into utilities/i }).first().click();
  const panel = page.getByRole('dialog', { name: 'Drill-down' });
  await expect(panel).toContainText('AJE-004');
  await expect(panel).toContainText(/lakeside/i);
});
