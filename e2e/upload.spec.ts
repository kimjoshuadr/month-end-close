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
  // Both files are classified; the CSV TB has no schedules, so the tool asks for them instead of erroring.
  await expect(page.getByText(/Received .*support\.txt.*tb\.csv|Received .*tb\.csv.*support\.txt/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Now add the schedules/i)).toBeVisible();
  await expect(page.locator('.alert.error')).toHaveCount(0);
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

// S4: oversized files are rejected with 413 before parsing.
test('S4 oversized file is rejected cleanly', async ({ page }) => {
  const big = tmp('big.pdf', Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(6 * 1024 * 1024, 0x20)]));
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles([big]);
  await expect(page.getByText(/exceeds the 5 MB/i).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: /load sample/i })).toBeVisible();
});

// S4: an exe renamed to .pdf fails magic bytes with 415.
test('S4 renamed exe is rejected by magic bytes', async ({ page }) => {
  const exe = tmp('evil.pdf', Buffer.from([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 1, 2, 3, 4]));
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles([exe]);
  await expect(page.getByText(/not a recognized packet file/i).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: /load sample/i })).toBeVisible();
});

// S4: a zip that is not a workbook and a malformed PDF fail cleanly (4xx/5xx, no crash).
test('S4 corrupt workbook and malformed PDF fail without crashing', async ({ page }) => {
  const fake = tmp('fake.xlsx', Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('this is not a workbook')]));
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles([fake]);
  await expect(page.locator('.alert.error').first()).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('button', { name: /load sample/i })).toBeVisible();
  const badPdf = tmp('bad.pdf', Buffer.from('%PDF-1.4\n%garbage that is not a document at all (((('));
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles([badPdf]);
  await expect(page.locator('.alert.error').first()).toBeVisible({ timeout: 60000 });
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

test('R2d one file at a time: waits for the second file, then builds the packet', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(WB);
  await expect(page.getByText(/Now add the Supporting PDF/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Packet incomplete/i)).toHaveCount(0);
  await expect(page.locator('.alert.error')).toHaveCount(0);
  await expect(page.getByText('Received', { exact: true })).toBeVisible();
  await input.setInputFiles(SUP);
  await expect(page.getByText('Validation and tie-outs')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('$24,697.50').first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Now add the/i)).toHaveCount(0);
});
