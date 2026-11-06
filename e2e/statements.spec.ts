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

// R13: draft ribbon, reviewer note in audit, sign-off dialog, final, no outbound calls.
// Finalizing now requires the sign-off dialog: resolve/acknowledge every
// open item, explain flagged flux lines, and sign with two names.
test('R13 draft, notes, sign-off, final, and no outbound requests', async ({ page, baseURL }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (/^https?:\/\//.test(url) && new URL(url).origin !== new URL(baseURL!).origin) external.push(url);
  });
  await loadSample(page);
  await page.goto('/statements');
  await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible();
  await page.locator('textarea[id^="notes-"]').first().fill('Reviewer checked NI tie-out.');
  await page.locator('.paper').click({ position: { x: 5, y: 5 } });
  await expect(page.getByText('Reviewer checked NI tie-out.')).toBeVisible();
  await page.goto('/audit');
  await expect(page.getByText(/Reviewer note saved/).first()).toBeVisible();
  // Clear every blocker the sign-off dialog enforces.
  await page.goto('/open-items');
  for (let i = 0; i < 7; i++) {
    if ((await page.getByText('All items resolved').first().count()) > 0) break;
    const save = page.getByRole('button', { name: 'Save answer' });
    const hasSave = (await save.count()) > 0;
    await page.getByRole('radio').first().click({ timeout: 10000 });
    if (hasSave) await save.click();
    await expect(page.getByText(`${i + 1} of 7 resolved`).first()).toBeVisible({ timeout: 15000 });
  }
  await page.goto('/statements');
  await page.getByRole('button', { name: /flux review/i }).click();
  const boxes = page.locator('textarea[aria-label^="Flux explanation"]');
  for (let i = 0; i < (await boxes.count()); i++) {
    await boxes.nth(i).fill('Reviewed — within tolerance.');
    await boxes.nth(i).press('Tab');
  }
  await expect(page.getByRole('button', { name: 'Flux Review', exact: true })).toBeVisible({ timeout: 15000 });
  await page.goto('/statements');
  await page.getByRole('button', { name: 'Mark as final' }).click();
  const dialog = page.getByRole('dialog', { name: /mark as final/i });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Prepared by').fill('Dana Whitfield');
  await dialog.getByLabel('Reviewed by').fill('Kim Okafor');
  await dialog.getByRole('button', { name: 'Confirm final' }).click();
  await expect(page.getByText('Final', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Prepared by Dana Whitfield/).first()).toBeVisible();
  expect(external).toEqual([]);
});

// R14: cutoff correction flows to statements, still balanced.
test('R14 aug cutoff correction updates statements', async ({ page }) => {
  await loadSample(page);
  await page.goto('/open-items?sel=aug-cutoff');
  await page.getByRole('radio', { name: /correct via retained earnings/i }).check();
  await page.getByRole('button', { name: 'Save answer' }).click();
  await expect(page.getByText('Answer saved: net income +1,017.50').first()).toBeVisible();
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
