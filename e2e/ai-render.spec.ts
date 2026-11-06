import { expect, test, type Page, type Route } from '@playwright/test';
import { loadSample } from './helpers';

const MD_REPLY = [
  '## Net income',
  '',
  'Adjusted NI is **$24,697.50** with *assumed* entries and `AJE-004`.',
  '',
  '- Wages accrue over 10 days',
  '- Materials match the register',
  '',
  '1. Open the worklist',
  '2. Save each answer',
  '',
  '| Step | NI effect |',
  '|---|---|',
  '| Accrual | 3,052.50 |',
  '| Electric | 1,250.00 |',
  '',
  'More at [docs](https://example.com/x).',
].join('\n');

// Stub /api/chat: GET reports enabled, POST delegates per test.
async function stubChat(page: Page, post: (route: Route) => Promise<void>) {
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { enabled: true } });
    return post(route);
  });
}

async function openAskAI(page: Page) {
  await page.goto('/entries');
  await page.getByRole('button', { name: /ask ai/i }).click();
  await page.getByRole('dialog', { name: 'Ask AI assistant' }).waitFor();
}

test.describe('AI rendering', () => {
  test('A1 markdown renders strong, lists, and tables, never raw markers', async ({ page }) => {
    await stubChat(page, (route) => route.fulfill({ json: { reply: MD_REPLY } }));
    await openAskAI(page);
    await page.getByRole('textbox', { name: /ask ai/i }).fill('Explain the close');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    const first = page.locator('.msg.assistant').first();
    await expect(first.locator('strong').first()).toBeVisible({ timeout: 15000 });
    await expect(first.locator('li').first()).toBeVisible();
    await expect(first.locator('table').first()).toBeVisible();
    await expect(first).not.toContainText('**');
    // URLs stay visible text, never anchors.
    await expect(first).toContainText('https://example.com/x');
    await expect(page.locator('.chatlog a')).toHaveCount(0);
  });

  test('A2 XSS payloads render as inert text', async ({ page }) => {
    page.on('dialog', () => { throw new Error('unexpected dialog'); });
    await stubChat(page, (route) => route.fulfill({ json: { reply: '<script>alert(1)</script><img src=x onerror=alert(1)> [x](javascript:alert(1))' } }));
    await openAskAI(page);
    await page.getByRole('textbox', { name: /ask ai/i }).fill('Hello?');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    const first = page.locator('.msg.assistant').first();
    await expect(first).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.chatlog script')).toHaveCount(0);
    await expect(page.locator('.chatlog img')).toHaveCount(0);
    await expect.poll(async () => page.locator('.chatlog').innerText(), { timeout: 15000 }).toContain('<script>alert(1)</script>');
  });

  test('A3 long token does not overflow at 390px', async ({ page }) => {
    await stubChat(page, (route) => route.fulfill({ json: { reply: `Token: ${'y'.repeat(300)} end.` } }));
    await openAskAI(page);
    await page.getByRole('textbox', { name: /ask ai/i }).fill('Long?');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.locator('.msg.assistant').first()).toBeVisible({ timeout: 15000 });
    const overflow = await page.locator('.drawer-body').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('A4 empty reply shows the fallback message', async ({ page }) => {
    await stubChat(page, (route) => route.fulfill({ json: { reply: '' } }));
    await openAskAI(page);
    await page.getByRole('textbox', { name: /ask ai/i }).fill('Hello?');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText('No answer came back. Try rephrasing.')).toBeVisible({ timeout: 15000 });
  });

  test('A5 502 shows an error bubble; Retry resends without the error as history', async ({ page }) => {
    const posts: { messages: { role: string; content: string }[] }[] = [];
    await stubChat(page, async (route) => {
      posts.push(route.request().postDataJSON());
      if (posts.length === 1) return route.fulfill({ status: 502, json: { message: 'upstream down' } });
      return route.fulfill({ json: { reply: 'Recovered **bold** answer.' } });
    });
    await openAskAI(page);
    await page.getByRole('textbox', { name: /ask ai/i }).fill('Hello?');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    const bubble = page.locator('.msg.assistant.error').first();
    await expect(bubble).toBeVisible({ timeout: 15000 });
    await bubble.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator('.msg.assistant', { hasText: 'Recovered' })).toBeVisible({ timeout: 15000 });
    expect(posts.length).toBe(2);
    expect(posts[1].messages).toEqual([{ role: 'user', content: 'Hello?' }]);
  });

  test('A6 slow reply shows the typing indicator', async ({ page }) => {
    await stubChat(page, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      return route.fulfill({ json: { reply: 'Slow answer.' } });
    });
    await openAskAI(page);
    await page.getByRole('textbox', { name: /ask ai/i }).fill('Hello?');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByLabel('Waiting for reply')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Slow answer.')).toBeVisible({ timeout: 15000 });
  });

  test('A7 over-limit chat input blocks Send', async ({ page }) => {
    await stubChat(page, (route) => route.fulfill({ json: { reply: 'ok' } }));
    await openAskAI(page);
    await page.getByRole('textbox', { name: /ask ai/i }).fill('z'.repeat(1001));
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
    await expect(page.getByText(/too long/)).toBeVisible();
  });

  test('A8 Esc closes Ask AI', async ({ page }) => {
    await stubChat(page, (route) => route.fulfill({ json: { reply: 'ok' } }));
    await openAskAI(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Ask AI assistant' })).toBeHidden();
  });

  test('A9 reply 502 shows an error bubble and Retry maps the option', async ({ page }) => {
    await loadSample(page);
    let calls = 0;
    await page.route('**/api/reply', async (route) => {
      calls += 1;
      if (calls === 1) return route.fulfill({ status: 502, json: { message: 'upstream down' } });
      return route.fulfill({ json: { explanation: 'Treat it as a **loan**.', option: 'loan' } });
    });
    await page.goto('/open-items?sel=owner-transfer');
    await page.locator('#c-owner-transfer').fill('hmm, tell me more about this??');
    await page.getByRole('button', { name: 'Send', exact: true }).first().click();
    const bubble = page.locator('.transcript .msg.assistant.error');
    await expect(bubble).toBeVisible({ timeout: 15000 });
    await bubble.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator('.transcript strong', { hasText: 'loan' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Answer saved: net income').first()).toBeVisible({ timeout: 15000 });
  });

  test('A10 over-limit reply input blocks Send', async ({ page }) => {
    await loadSample(page);
    await page.goto('/open-items?sel=owner-transfer');
    await page.locator('#c-owner-transfer').fill('z'.repeat(1001));
    await expect(page.getByRole('button', { name: 'Send', exact: true }).first()).toBeDisabled();
  });
});
