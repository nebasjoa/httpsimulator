import { test, expect } from '@playwright/test';

test('git clean -fd is flagged as destructive with no possible undo', async ({ page }) => {
  await page.goto('/git');
  await page.locator('.scenario-picker select').selectOption('clean-cannot-be-undone');

  const stepForward = page.getByRole('button', { name: 'Step forward' });
  // 0 init, 1 status, 2 clean -fd, 3 status
  for (let i = 0; i < 2; i++) {
    await stepForward.click();
  }

  await expect(page.locator('.step-detail .flag.destructive')).toBeVisible();
  await expect(page.locator('.step-detail .warning-box')).toContainText('No undo');
  await expect(page.locator('.step-detail .warning-box')).toContainText('there is no git command that brings this back', { ignoreCase: true });
});
