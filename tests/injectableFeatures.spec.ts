import { test, expect } from '@playwright/test';

test('CORS preflight toggle adds an OPTIONS exchange before the real request', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Cross-origin request (adds CORS preflight)').check();

  const pairs = page.locator('.wire-pair');
  await expect(pairs).toHaveCount(2);
  await expect(pairs.nth(0)).toContainText('OPTIONS /paymentpage HTTP/1.1');
  await expect(pairs.nth(0)).toContainText('Access-Control-Request-Method: POST');
  await expect(pairs.nth(0)).toContainText('HTTP/1.1 204 No Content');
  await expect(pairs.nth(0)).toContainText('Access-Control-Allow-Origin');
});

test('conditional GET toggle adds a second request answered with 304', async ({ page }) => {
  await page.goto('/');

  await page.locator('.request-builder select').first().selectOption('GET');
  await page.getByLabel('Conditional GET (adds If-None-Match refetch)').check();

  const pairs = page.locator('.wire-pair');
  await expect(pairs).toHaveCount(2);
  await expect(pairs.nth(0)).toContainText('ETag: "33a64df551"');
  await expect(pairs.nth(1)).toContainText('If-None-Match: "33a64df551"');
  await expect(pairs.nth(1)).toContainText('HTTP/1.1 304 Not Modified');
});

test('connection-refused failure mode truncates the sequence with no response wire', async ({ page }) => {
  await page.goto('/');

  await page.locator('.server-config select').selectOption('refused');

  await expect(page.locator('.wire-pair')).toHaveCount(0);
  await expect(page.locator('.wire-inspector .empty-hint')).toBeVisible();

  await page.locator('.timeline .marker').last().click();
  await expect(page.locator('.event-detail')).toContainText('Connection refused');
});
