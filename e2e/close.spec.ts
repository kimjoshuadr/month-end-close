import * as fs from 'fs';
import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';
import { loadSample, stripNI } from './helpers';

async function resolveAll(page: import('@playwright/test').Page) {
  await page.goto('/open-items');
  for (let i = 0; i < 7; i++) {
    if ((await page.getByText('All items resolved').first().count()) > 0) break;
    const save = page.getByRole('button', { name: 'Save answer' });
    const hasSave = (await save.count()) > 0;
    await page.getByRole('radio').first().click({ timeout: 10000 });
    if (hasSave) await save.click();
    await expect(page.getByText(`${i + 1} of 7 resolved`).first()).toBeVisible({ timeout: 15000 });
  }
}

async function explainAllFlux(page: import('@playwright/test').Page) {
  await page.goto('/statements');
  await page.getByRole('button', { name: /flux review/i }).click();
  const boxes = page.locator('textarea[aria-label^="Flux explanation"]');
  for (let i = 0; i < (await boxes.count()); i++) {
    await boxes.nth(i).fill('Reviewed — within tolerance.');
    await boxes.nth(i).press('Tab');
  }
  await expect(page.getByRole('button', { name: 'Flux Review', exact: true })).toBeVisible({ timeout: 15000 });
}

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let cur = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); out.push(row); row = []; cur = ''; }
    else cur += c;
  }
  return out;
}

// C1: sign-off is blocked with reasons while work remains.
test('C1 sign-off blocked with reasons while items are open', async ({ page }) => {
  await loadSample(page);
  await page.goto('/statements');
  await page.getByRole('button', { name: 'Mark as final' }).click();
  const dialog = page.getByRole('dialog', { name: /mark as final/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/open items remain/)).toBeVisible();
  await expect(dialog.getByText(/flagged flux/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Confirm final' })).toBeDisabled();
  await dialog.getByLabel('Prepared by').fill('Dana');
  await dialog.getByLabel('Reviewed by').fill('dana');
  await expect(dialog.getByText(/must be different/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Confirm final' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

// C2: JE CSV downloads with the right row count, balanced totals, reversals.
test('C2 JE CSV export downloads balanced with reversal dates', async ({ page }) => {
  await loadSample(page);
  await page.goto('/entries');
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export je import/i }).click(),
  ]);
  expect(dl.suggestedFilename()).toBe('month-end-close-JE-2026-09.csv');
  const filePath = await dl.path();
  expect(filePath).toBeTruthy();
  const rows = parseCsv(fs.readFileSync(filePath!, 'utf8'));
  expect(rows[0]).toEqual(['Journal Entry #', 'Date', 'Account Number', 'Account Name', 'Debit', 'Credit', 'Line Memo', 'Reversal Date']);
  expect(rows.length).toBe(12);
  const data = rows.slice(1);
  const dr = data.reduce((s, r) => s + Number(r[4]), 0);
  const cr = data.reduce((s, r) => s + Number(r[5]), 0);
  expect(Math.abs(dr - cr)).toBeLessThan(0.005);
  expect(data.filter((r) => r[0] === 'AJE-004').every((r) => r[7] === '10/01/2026')).toBe(true);
});

// C3: Excel export downloads with one sheet per statement.
test('C3 Excel export downloads with all sheets', async ({ page }) => {
  await loadSample(page);
  await page.goto('/statements');
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export to excel/i }).click(),
  ]);
  const filePath = await dl.path();
  expect(filePath).toBeTruthy();
  const wb = XLSX.readFile(filePath!);
  expect(wb.SheetNames).toEqual(['Cover', 'IS Month', 'IS YTD', 'Balance Sheet', 'Cash Flows', 'TTM', 'Flux Review']);
});

// C4: sign-off happy path — cover names, audit, reopen clears.
test('C4 sign-off, cover names, and reopen', async ({ page }) => {
  await loadSample(page);
  await resolveAll(page);
  await explainAllFlux(page);
  expect(await stripNI(page)).toBe('$24,697.50');
  await page.goto('/statements');
  await page.getByRole('button', { name: 'Mark as final' }).click();
  const dialog = page.getByRole('dialog', { name: /mark as final/i });
  await dialog.getByLabel('Prepared by').fill('Dana Whitfield');
  await dialog.getByLabel('Reviewed by').fill('Kim Okafor');
  await dialog.getByRole('button', { name: 'Confirm final' }).click();
  await expect(page.getByText('Final', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Prepared by Dana Whitfield/).first()).toBeVisible();
  await page.goto('/audit');
  await expect(page.getByRole('row', { name: /Marked as final/ }).first()).toBeVisible();
  await page.goto('/statements');
  await page.getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByText(/Draft · 0 open/).first()).toBeVisible();
  await page.goto('/audit');
  await expect(page.getByRole('row', { name: /Reopened/ }).first()).toBeVisible();
});
