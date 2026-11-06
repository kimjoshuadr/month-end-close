import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect, test } from '@playwright/test';
import { AUG, loadSample, stripNI, SUP, uploadFiles, WB } from './helpers';

const SUPPORT_TXT = `First Prairie Bank
Business Checking Statement
Account ending 2207 | Statement period: 09/01/2026 - 09/30/2026
Beginning balance 59,900.00
Total deposits and credits 10,000.00
Total withdrawals and debits 5,200.00
Ending balance 64,700.00
Account activity
Date Description Withdrawals Deposits Balance
09/01 Check 1048 - Westgate Properties (rent) 5,200.00 54,700.00
09/30 Monthly account and merchant fees 300.00 64,700.00

Lakeside Electric & Power
PO Box 4410, Springfield, MO 65808
Invoice / statement: Acct 7710-3392 Statement
Date: 09/29/2026
Due: 10/19/2026
Service period 09/01/2026 - 09/30/2026 (shop and yard)
Description Qty Unit price Amount
Electric usage, 6,840 kWh 1 1,070.00 1,070.00
Demand and service charges 1 180.00 180.00
Total due 1,250.00

From: Dana Whitfield <dana@greenlinelandscape.example>
To: Accounting Team
Date: Thursday, October 1, 2026
Subject: September close

Hi team,
The $5k that hit the account on the 12th was me covering payroll.
Thanks,
Dana
`;

const TB_CSV = `Acct #,Account name,Debit,Credit
1000,Operating Checking,84320,
1200,Accounts Receivable,41800,
2000,Accounts Payable,,18450
Total,,"126,120","18,450"
`;

function tmp(name: string, content: string | Buffer): string {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qaqc-')), name);
  fs.writeFileSync(p, content);
  return p;
}

// R2: real upload of the 3 sample files via the file input.
test('R2 uploads the packet and August PDF is accepted', async ({ page }) => {
  await uploadFiles(page, [WB, SUP, AUG]);
  await expect(page.getByText('Workbook', { exact: false }).first()).toBeVisible();
  expect(await stripNI(page)).toBe('$24,697.50');
});

// R2b: text upload classified by content.
test('R2b txt supporting text and csv TB are classified', async ({ page }) => {
  const txt = tmp('support.txt', SUPPORT_TXT);
  const csv = tmp('tb.csv', TB_CSV);
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles([txt, csv]);
  await expect(page.getByText(/packet incomplete|missing/i).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Workbook', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('schedules', { exact: false }).first()).toBeVisible();
});

// R2b (negative): unrelated txt gets a clear error.
test('R2b unrelated txt is rejected clearly', async ({ page }) => {
  const txt = tmp('notes.txt', 'hello world, nothing to see here');
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles([txt]);
  await expect(page.getByText(/not a recognized packet file/i).first()).toBeVisible({ timeout: 30000 });
});

// R2c: random image does not crash the app.
test('R2c image upload errors cleanly', async ({ page }) => {
  const png = tmp(
    'pixel.png',
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  );
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles([png]);
  await expect(page.getByText(/not a recognized packet file|could not|error/i).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: /load sample/i })).toBeVisible();
});

// R3: five tie-outs, all OK, exact values.
test('R3 validation grid ties out', async ({ page }) => {
  await loadSample(page);
  const grid = page.locator('.panel', { hasText: 'Validation and tie-outs' });
  for (const [label, value] of [
    ['bank-cash', '84,320'],
    ['payroll-bank', '20,350'],
    ['materials', '14,200'],
    ['fuel', '4,300'],
    ['loan-principal', '1,640'],
  ]) {
    const row = grid.getByRole('row', { name: new RegExp(label) });
    await expect(row).toContainText(value);
    await expect(row).toContainText('OK');
  }
  await expect(grid.getByRole('row')).toHaveCount(6); // header + 5 checks
});
