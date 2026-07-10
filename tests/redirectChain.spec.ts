import { test, expect } from '@playwright/test';

test('redirect-chain shows method preservation and session cookie across hops', async ({ page }) => {
  await page.goto('/');

  await page.locator('.scenario-picker select').selectOption('redirect-chain');
  await page.locator('.request-builder select').first().selectOption('POST');

  // 302 Found is a classic redirect: the follow-up request becomes GET.
  await page.locator('.server-config').getByRole('button', { name: '302 Found' }).click();
  const exchange1 = page.locator('.wire-pair', { hasText: 'Exchange 1' });
  const exchange2Get = page.locator('.wire-pair', { hasText: 'Exchange 2' });
  await expect(exchange1).toContainText('Set-Cookie: sessionid=abc123');
  await expect(exchange2Get).toContainText('GET /paymentpage');
  await expect(exchange2Get).toContainText('Cookie: sessionid=abc123');

  // 307 Temporary Redirect preserves the original method.
  await page.locator('.server-config').getByRole('button', { name: '307 Temporary Redirect' }).click();
  const exchange2Post = page.locator('.wire-pair', { hasText: 'Exchange 2' });
  await expect(exchange2Post).toContainText('POST /retry');
});
