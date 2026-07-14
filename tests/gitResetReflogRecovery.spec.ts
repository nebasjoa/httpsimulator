import { test, expect } from '@playwright/test';

test('recovers a commit dropped by reset --hard using reflog', async ({ page }) => {
  await page.goto('/git');
  await page.locator('.scenario-picker select').selectOption('reset-hard-reflog-recovery');

  const stepForward = page.getByRole('button', { name: 'Step forward' });
  for (let i = 0; i < 25; i++) {
    await stepForward.click();
  }

  // Final "git log --oneline" step should show v3 restored via HEAD@{1}.
  await expect(page.locator('.step-detail .detail-text')).toContainText('v3');
});

test('flags reset --hard as destructive with an unrecoverable-working-changes warning', async ({ page }) => {
  await page.goto('/git');
  await page.locator('.scenario-picker select').selectOption('reset-hard-reflog-recovery');

  const stepForward = page.getByRole('button', { name: 'Step forward' });
  // Step to the first "git reset --hard" (loses uncommitted work) - step index 6.
  for (let i = 0; i < 6; i++) {
    await stepForward.click();
  }

  await expect(page.locator('.step-detail .flag.destructive')).toBeVisible();
  await expect(page.locator('.step-detail .warning-box')).toContainText('never saved anywhere git tracks');
});
