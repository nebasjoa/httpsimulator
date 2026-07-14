import { test, expect } from '@playwright/test';

test('dropdown switches between HTTP Simulator and Git Simulator', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('HTTP Simulator');

  await page.getByLabel('Choose simulator').selectOption('/git');
  await expect(page).toHaveURL(/\/git$/);
  await expect(page.locator('h1')).toHaveText('Git Simulator');
  await expect(page.locator('.git-terminal')).toBeVisible();

  await page.getByLabel('Choose simulator').selectOption('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('h1')).toHaveText('HTTP Simulator');
});
