import { test, expect } from '@playwright/test';

test('payment-flow scenario renders all four parties and the full S2S/browser/webhook narrative', async ({ page }) => {
  await page.goto('/');
  await page.locator('.scenario-picker select').selectOption('payment-flow');

  const labels = page.locator('.lifeline-label');
  await expect(labels).toHaveCount(4);
  await expect(labels).toContainText(['Client', 'Server', 'Gateway', 'Issuer']);

  const inspector = page.locator('.wire-inspector');
  await expect(inspector).toContainText('POST /kvp/create');
  await expect(inspector).toContainText('GET /paymentpage');
  await expect(inspector).toContainText('acs.issuingbank.example');
  await expect(inspector).toContainText('POST /webhook/notify');
});
