import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadSample } from './helpers';

// R19: no serious or critical accessibility violations on any route.
for (const route of ['/', '/entries', '/open-items', '/statements', '/audit']) {
  test(`R19 a11y ${route}`, async ({ page }) => {
    await loadSample(page);
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} nodes`), `a11y on ${route}`).toEqual([]);
  });
}
