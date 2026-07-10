import { test, expect } from '@playwright/test';

test('HTTP/2 always uses one connection while HTTP/1.1 caps at 6', async ({ page }) => {
  await page.goto('/');

  const section = page.locator('.http2-comparison');
  const slider = section.locator('input[type="range"]');
  await slider.evaluate((el, value) => {
    const input = el as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, '8');

  const http1Block = section.locator('.protocol-block').first();
  const http2Block = section.locator('.protocol-block').nth(1);

  await expect(http1Block.locator('.lane')).toHaveCount(6);
  await expect(http2Block.locator('.lane')).toHaveCount(1);
});
