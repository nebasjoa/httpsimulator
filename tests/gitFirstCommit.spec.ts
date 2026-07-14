import { test, expect } from '@playwright/test';

test('steps through the default first-commit scenario and shows the commit in the graph', async ({ page }) => {
  await page.goto('/git');

  const stepForward = page.getByRole('button', { name: 'Step forward' });
  for (let i = 0; i < 10; i++) {
    await stepForward.click();
  }

  await expect(page.locator('.commit-graph .message')).toContainText('Initial commit');
  await expect(page.locator('.step-detail')).toContainText('Initial commit');
});
