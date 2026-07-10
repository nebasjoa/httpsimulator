import { test, expect } from '@playwright/test';

test('steps through simple-request and shows the response wire for a chosen status', async ({ page }) => {
  await page.goto('/');

  await page.locator('.server-config').getByRole('button', { name: '302 Found' }).click();

  const stepForward = page.getByRole('button', { name: 'Step forward' });
  for (let i = 0; i < 10; i++) {
    await stepForward.click();
  }

  const responsePanel = page.locator('.wire-panel').filter({ hasText: 'Response' });
  await expect(responsePanel).toContainText('HTTP/1.1 302 Found');
  await expect(responsePanel).toContainText('Location: https://pay.computop.com/paymentpage?id=abc');
  await expect(responsePanel.locator('.crlf').first()).toBeVisible();

  // clicking the status line should surface the catalog explanation
  await responsePanel.getByRole('button', { name: /HTTP\/1\.1 302 Found/ }).click();
  await expect(page.locator('.info-panel')).toContainText('Temporary redirect');
});
