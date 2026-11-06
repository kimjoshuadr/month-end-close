import { expect, test } from '@playwright/test';
import { loadSample, stripNI } from './helpers';

// I1: toast Undo restores NI exactly and logs to the audit trail.
test('I1 undo restores NI after an answer', async ({ page }) => {
  await loadSample(page);
  await page.goto('/open-items?sel=owner-transfer');
  await page.getByRole('radio', { name: /already correct as revenue/i }).check();
  await page.getByRole('button', { name: 'Save answer' }).click();
  expect(await stripNI(page)).toBe('$29,697.50');
  await expect(page.getByRole('button', { name: 'Undo' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).first().click();
  expect(await stripNI(page)).toBe('$24,697.50');
  await page.goto('/audit');
  await expect(page.getByText(/Undo:/).first()).toBeVisible();
});

// I2: j/k/1/Enter resolves an item without the mouse.
test('I2 keyboard j, 1, Enter resolves an item', async ({ page }) => {
  await loadSample(page);
  await page.goto('/open-items');
  await expect(page.getByRole('row', { name: /\$5,000 transfer/ })).toBeVisible();
  await page.locator('.page').click({ position: { x: 5, y: 5 } });
  const first = await page.locator('.panel .panel-h').nth(1).innerText();
  await page.keyboard.press('j');
  const moved = await page.locator('.panel .panel-h').nth(1).innerText();
  expect(moved).not.toBe(first);
  await page.keyboard.press('k');
  await expect(page.locator('.panel .panel-h').nth(1)).toHaveText(first);
  await page.keyboard.press('1');
  await page.keyboard.press('Enter');
  await expect(page.getByText('1 of 7 resolved').first()).toBeVisible({ timeout: 15000 });
});

// I2b: hovering an option previews its NI effect next to the current NI.
test('I2b hover previews the option NI effect', async ({ page }) => {
  await loadSample(page);
  await page.goto('/open-items?sel=owner-transfer');
  await page.getByRole('radio', { name: /already correct as revenue/i }).hover();
  await expect(page.getByText(/would be \$29,697\.50/)).toBeVisible();
});

// I3: Esc closes the drill-down slide-over.
test('I3 esc closes the drill-down', async ({ page }) => {
  await loadSample(page);
  await page.goto('/statements');
  await page.getByRole('button', { name: 'Income Statement — month', exact: true }).click();
  await page.getByRole('button', { name: /drill into utilities/i }).first().click();
  const panel = page.getByRole('dialog', { name: 'Drill-down' });
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

// I4: ? opens the shortcuts help, Esc closes it.
test('I4 question mark opens shortcuts help', async ({ page }) => {
  await loadSample(page);
  await page.goto('/entries');
  await page.locator('.page').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('?');
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toBeVisible();
  await expect(help.getByText('Focus global search')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
});

// I5: answering everything shows the calm resolved state linking to statements.
test('I5 all items resolved state', async ({ page }) => {
  await loadSample(page);
  await page.goto('/open-items');
  for (let i = 0; i < 7; i++) {
    if (await page.getByText('All items resolved').first().count() > 0) break;
    const radios = page.getByRole('radio');
    await radios.first().check({ timeout: 10000 });
    const save = page.getByRole('button', { name: 'Save answer' });
    if (await save.count() > 0) {
      await save.click();
      await page.waitForTimeout(500);
    } else {
      // Info flags acknowledge on check and auto-advance.
      await page.waitForTimeout(500);
    }
  }
  await expect(page.getByText('All items resolved').first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('link', { name: /review financial statements/i })).toBeVisible();
});
