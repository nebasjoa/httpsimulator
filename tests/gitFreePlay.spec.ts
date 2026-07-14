import { test, expect } from '@playwright/test';

test('free-play: typed commands run against a blank repo and bad commands show an error', async ({ page }) => {
  await page.goto('/git');
  await page.getByRole('button', { name: 'Start from a blank repo instead' }).click();

  const input = page.getByLabel('Type a git command');
  const run = page.getByRole('button', { name: 'Run' });

  await input.fill('git init');
  await run.click();
  await expect(page.locator('.git-terminal .line').last()).toContainText('git init');

  await input.fill('git nonsense');
  await run.click();
  await expect(page.locator('.git-terminal .output.error').last()).toContainText('is not a git command');

  await input.fill('git add test.txt');
  await run.click();
  await input.fill('git commit -m "first"');
  await run.click();
  await expect(page.locator('.commit-graph .message')).toContainText('first');
});
