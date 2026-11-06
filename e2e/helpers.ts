import * as fs from 'fs';
import * as path from 'path';
import { expect, type Page } from '@playwright/test';

export const SAMPLES = path.resolve('samples');
export const WB = path.join(SAMPLES, '01_Month_End_Workbook_Sep2026 (1).xlsx');
export const SUP = path.join(SAMPLES, '02_Supporting_Documents_Sep2026 (1).pdf');
export const AUG = path.join(SAMPLES, '03_Example_Financial_Statements_Aug2026 (1).pdf');

// True when a key file holds DEEPSEEK_API_KEY. Never prints the key.
export function hasKey(): boolean {
  for (const f of ['.env.local', '.env']) {
    if (fs.existsSync(f) && /^DEEPSEEK_API_KEY=\S+/m.test(fs.readFileSync(f, 'utf8'))) return true;
  }
  return !!process.env.DEEPSEEK_API_KEY;
}

async function settled(page: Page) {
  // The store persists to sessionStorage in an effect; wait for it before navigating.
  await page.waitForFunction(() => !!sessionStorage.getItem('closedesk.session.v1'), null, { timeout: 15000 });
}

// Real upload through the hidden file input (not Load sample).
export async function uploadFiles(page: Page, files: string[]) {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(files);
  await expect(page.getByText('Validation and tie-outs')).toBeVisible({ timeout: 30000 });
  await settled(page);
}

// One-click sample load, then wait for validation.
export async function loadSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /load sample/i }).click();
  await expect(page.getByText('Validation and tie-outs')).toBeVisible({ timeout: 30000 });
  await settled(page);
}

// Adjusted NI from the summary strip, waiting for the count transition to settle.
// Delta chips render inside the KPI, so extract the first dollar figure.
export async function stripNI(page: Page): Promise<string> {
  const strip = page.locator('.strip');
  await expect(strip).toBeVisible();
  let prev = '';
  for (let i = 0; i < 20; i++) {
    const kpis = await strip.locator('.kpi').allInnerTexts();
    const adj = kpis.find((k) => k.startsWith('ADJUSTED NI')) ?? '';
    const m = /\$[\d,]+\.\d{2}/.exec(adj);
    const val = m ? m[0] : '';
    if (val === prev && val !== '') return val;
    prev = val;
    await page.waitForTimeout(120);
  }
  return prev;
}

export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  return {
    assertNone: () => {
      expect(errors, 'page errors').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
    },
  };
}
