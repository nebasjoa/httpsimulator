import { test, expect } from '@playwright/test';

test('dropdown navigates to REST API Simulator', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose simulator').selectOption('/rest-api');
  await expect(page).toHaveURL(/\/rest-api$/);
  await expect(page.locator('h1')).toHaveText('REST API Simulator');
});

test('method explorer shows CRUD semantics per method', async ({ page }) => {
  await page.goto('/rest-api');

  await expect(page.getByRole('tab', { name: 'GET' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.method-body .narrative')).toContainText('read order 42');

  await page.getByRole('tab', { name: 'POST', exact: true }).click();
  await expect(page.locator('.method-body .narrative')).toContainText('does not exist yet');
  await expect(page.locator('.method-body .wire-text').first()).toContainText('POST /orders HTTP/1.1');

  await page.getByRole('tab', { name: 'DELETE' }).click();
  await expect(page.locator('.method-body .state-box .none')).toContainText('no longer exists');
});

test('query parameter explainer covers ?parameter=test', async ({ page }) => {
  await page.goto('/rest-api');
  await page.getByRole('button', { name: '(generic example)' }).click();
  await expect(page.locator('.param-detail')).toContainText('/orders?parameter=test');
  await expect(page.locator('.param-detail')).toContainText('parameter');
});

test('authorization explainer distinguishes 401 from 403', async ({ page }) => {
  await page.goto('/rest-api');
  await page.locator('.scheme-picker').getByRole('button', { name: 'Bearer token' }).click();
  await expect(page.locator('.scheme-detail .header-example')).toContainText('Bearer');
  await expect(page.locator('.scheme-detail')).toContainText('401');
});

test('glossary filters terms', async ({ page }) => {
  await page.goto('/rest-api');
  await page.getByPlaceholder('Filter terms…').fill('HATEOAS');
  await expect(page.locator('.term-list .term-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'HATEOAS', exact: true }).click();
  await expect(page.locator('.term-row dd')).toBeVisible();
});
