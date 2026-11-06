import { expect, test } from '@playwright/test';
import { loadSample, stripNI } from './helpers';

const TB_ACCTS = [1000, 1200, 1300, 1500, 1510, 2000, 2100, 2200, 2500, 3000, 3100, 3900, 4000, 4100, 5000, 5100, 6000, 6010, 6100, 6110, 6120, 6130, 6140, 6150, 6160, 6170, 6180, 6190];

// R4: schedule-driven entries booked with exact amounts.
test('R4 entries are booked with schedule amounts', async ({ page }) => {
  await loadSample(page);
  await page.goto('/entries');
  const grid = page.locator('.panel', { hasText: 'Journal entries' });
  for (const [id, amount] of [['AJE-001', '1,800.00'], ['AJE-002', '2,400.00'], ['AJE-003', '3,052.50'], ['AJE-004', '1,250.00']]) {
    const row = grid.getByRole('row', { name: new RegExp(id) });
    await expect(row).toContainText('Booked');
    await expect(row).toContainText(amount);
  }
});

// R5: every record balances, sources on every line, TB accounts only.
test('R5 records balance with sources and TB accounts', async ({ page }) => {
  await loadSample(page);
  for (const id of ['prepaid', 'depreciation', 'payroll-accrual', 'electric', 'owner-transfer', 'aug-cutoff', 'northline']) {
    await page.goto(`/entries?sel=${id}`);
    const record = page.locator('tr', { hasText: 'Totals ·' });
    await expect(record.getByText('Dr = Cr')).toBeVisible();
    const acctCells = await record.locator('td.mono').allInnerTexts();
    expect(acctCells.length).toBeGreaterThan(0);
    for (const raw of acctCells) {
      const no = Number(raw.trim());
      expect(Number.isFinite(no) && raw.trim() !== '').toBe(true);
      if (no !== 2600) expect(TB_ACCTS).toContain(no);
    }
    const sources = await record.getByRole('button').allInnerTexts();
    expect(sources.join(' ').length).toBeGreaterThan(20);
  }
  await page.goto('/entries');
  // 2600 is not booked by default.
  await expect(page.getByText('2600')).toHaveCount(0);
});

// R6: bridge from 38,200 to 24,697.50.
test('R6 bridge foots', async ({ page }) => {
  await loadSample(page);
  await page.goto('/entries');
  const bridge = page.locator('.panel', { hasText: 'Net income bridge' });
  await expect(bridge.getByText('38,200.00').first()).toBeVisible();
  await expect(bridge.getByText('24,697.50').first()).toBeVisible();
  await expect(bridge.getByText('(13,502.50)').first()).toBeVisible();
});

// R10: edit debit and credit, totals update; Reset restores.
test('R10 edit AJE-004 to 2,000 updates NI, reset restores', async ({ page }) => {
  await loadSample(page);
  await page.goto('/entries?sel=electric');
  const debit = page.getByLabel('Lakeside Electric September bill debit');
  await debit.fill('2000');
  await debit.press('Tab');
  const credit = page.getByLabel('Lakeside Electric September bill credit');
  await credit.fill('2000');
  await credit.press('Tab');
  expect(await stripNI(page)).toBe('$23,947.50');
  await expect(page.getByText('Dr = Cr').first()).toBeVisible();
  for (const btn of await page.getByRole('button', { name: 'Reset', exact: true }).all()) await btn.click();
  expect(await stripNI(page)).toBe('$24,697.50');
});

// R10b: debit-only edit is visibly unbalanced with no NaN.
test('R10b unbalanced edit is flagged without NaN', async ({ page }) => {
  await loadSample(page);
  await page.goto('/entries?sel=electric');
  const debit = page.getByLabel('Lakeside Electric September bill debit');
  await debit.fill('2000');
  await debit.press('Tab');
  await expect(page.getByText('Unbalanced').first()).toBeVisible();
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/NaN/);
});
