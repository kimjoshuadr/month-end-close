import * as fs from 'fs';
import { expect, test } from '@playwright/test';
import { loadSample } from './helpers';

// R18: no body overflow, sticky app bar, screenshots per viewport.
for (const route of ['/', '/entries', '/open-items', '/statements', '/audit']) {
  test(`R18 ${route} fits its viewport`, async ({ page }) => {
    await loadSample(page);
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
    const before = await page.locator('.appbar').boundingBox();
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(200);
    const after = await page.locator('.appbar').boundingBox();
    expect(before?.y).toBe(0);
    expect(after?.y).toBe(0);
    const name = route === '/' ? 'packet' : route.slice(1).replace('/', '-');
    const w = page.viewportSize()?.width ?? 0;
    await page.screenshot({ path: `docs/screenshots/qa/${name}-${w}.png` });
  });
}
