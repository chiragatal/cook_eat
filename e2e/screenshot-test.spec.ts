import { test, expect } from '@playwright/test';

/**
 * This test is specifically designed to test screenshot functionality
 * It takes screenshots at various points to ensure they're working properly
 */
test('verify screenshots are captured correctly', async ({ page }) => {
  // Go to the home page
  await page.goto('/');

  // Take a screenshot of the page
  await page.screenshot({ path: 'artifacts/screenshots/home-page.png' });

  // Log that we've taken a screenshot
  console.log('Took screenshot of home page');

  // Verify the page has loaded correctly
  await expect(page).toHaveTitle(/Cook-Eat/);

  // Take screenshot with a different name for debugging
  await page.screenshot({ path: 'artifacts/screenshots/debug/home-page-debug.png' });
  console.log('Took debug screenshot');

  // Click on a link or button if available
  try {
    const button = page.getByRole('button').first();
    if (await button.isVisible()) {
      await button.click();
      // Take another screenshot after clicking
      await page.screenshot({ path: 'artifacts/screenshots/after-click.png' });
      console.log('Took screenshot after clicking button');
    }
  } catch (error) {
    console.log('No clickable button found, continuing test');
  }

  // Force a screenshot to be taken by Playwright's automatic screenshot feature
  // by deliberately causing a test failure
  // This line is commented out by default, uncomment to test failure screenshots
  // await expect(page.locator('.non-existent-element')).toBeVisible();

  // Take a final screenshot
  await page.screenshot({ path: 'artifacts/screenshots/final-state.png' });
  console.log('Took final screenshot');

  console.log('Screenshot test completed successfully');
});
