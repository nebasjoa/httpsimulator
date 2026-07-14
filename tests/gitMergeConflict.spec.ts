import { test, expect } from '@playwright/test';

test('resolves a merge conflict between two branches', async ({ page }) => {
  await page.goto('/git');
  await page.locator('.scenario-picker select').selectOption('merge-conflict');

  const stepForward = page.getByRole('button', { name: 'Step forward' });
  for (let i = 0; i < 25; i++) {
    await stepForward.click();
  }

  await expect(page.locator('.step-detail')).toContainText('Merge feature-b, resolve conflict');
  await expect(page.locator('.commit-graph .message', { hasText: 'Merge feature-b, resolve conflict' })).toBeVisible();
});
