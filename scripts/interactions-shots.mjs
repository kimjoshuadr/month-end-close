// Captures key interaction sequences at 1440/820/390 into docs/screenshots/interactions/.
import { chromium } from '@playwright/test';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:3210';
const WIDTHS = [1440, 820, 390];

async function loadSample(page) {
  await page.goto(`${BASE}/`);
  await page.getByRole('button', { name: /load sample/i }).click();
  await page.getByText('Validation and tie-outs').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => !!sessionStorage.getItem('closedesk.session.v1'), null, { timeout: 15000 });
}

async function shot(page, out, full = false) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: out, fullPage: full });
  console.log('saved', out);
}

for (const w of WIDTHS) {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: w, height: 900 } })).newPage();
  await loadSample(page);

  // 01: worklist with a selected row.
  await page.goto(`${BASE}/open-items?sel=owner-transfer`);
  await page.getByText('Options (net income effect)').waitFor();
  await shot(page, `docs/screenshots/interactions/${w}/01-open-items-selected.png`);

  // 02: hover preview of the NI effect.
  await page.getByRole('radio', { name: /already correct as revenue/i }).hover();
  await page.getByText(/would be/).waitFor();
  await shot(page, `docs/screenshots/interactions/${w}/02-hover-preview.png`);

  // 03: save -> toast with Undo + delta chip.
  await page.getByRole('radio', { name: /already correct as revenue/i }).check();
  await page.getByRole('button', { name: 'Save answer' }).click();
  await page.getByText('Answer saved: net income +5,000.00').waitFor({ timeout: 10000 });
  await shot(page, `docs/screenshots/interactions/${w}/03-toast-undo.png`);

  // 04: shortcuts help.
  await page.keyboard.press('?');
  await page.getByRole('dialog', { name: 'Keyboard shortcuts' }).waitFor();
  await shot(page, `docs/screenshots/interactions/${w}/04-shortcuts-help.png`);
  await page.keyboard.press('Escape');

  // 05: drill-down slide-over.
  await page.goto(`${BASE}/statements`);
  await page.getByRole('button', { name: 'Income Statement — month', exact: true }).click();
  await page.getByRole('button', { name: /drill into utilities/i }).first().click();
  await page.getByRole('dialog', { name: 'Drill-down' }).waitFor();
  await shot(page, `docs/screenshots/interactions/${w}/05-drilldown.png`);
  await page.keyboard.press('Escape');

  // 06: expanded entry record with inline editing affordance.
  await page.goto(`${BASE}/entries?sel=electric`);
  await page.getByText('Totals ·').waitFor();
  const debit = page.getByLabel('Lakeside Electric September bill debit');
  await debit.hover();
  await shot(page, `docs/screenshots/interactions/${w}/06-entry-editing.png`);

  // 07: all-resolved state after answering everything (fresh session).
  await page.close();
  const page2 = await (await browser.newContext({ viewport: { width: w, height: 900 } })).newPage();
  await loadSample(page2);
  await page2.goto(`${BASE}/open-items`);
  for (let i = 0; i < 7; i++) {
    if ((await page2.getByText('All items resolved').count()) > 0) break;
    const save = page2.getByRole('button', { name: 'Save answer' });
    const hasSave = (await save.count()) > 0;
    await page2.getByRole('radio').first().click({ timeout: 10000 });
    if (hasSave) await save.click();
    await page2.getByText(`${i + 1} of 7 resolved`).first().waitFor({ timeout: 15000 });
  }
  await page2.getByText('All items resolved').waitFor({ timeout: 30000 });
  await page2.waitForTimeout(350);
  await page2.screenshot({ path: `docs/screenshots/interactions/${w}/07-all-resolved.png` });
  console.log('saved', `docs/screenshots/interactions/${w}/07-all-resolved.png`);

  await browser.close();
}
console.log('done');
