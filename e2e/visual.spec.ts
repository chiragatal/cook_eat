import { test, expect } from '@playwright/test';

// Pages to take screenshots of
const pages = [
  { name: 'Home', path: '/' },
  { name: 'AllRecipes', path: '/all-recipes' },
  { name: 'MyRecipes', path: '/my-recipes' },
  { name: 'Login', path: '/auth/login' },
  { name: 'Register', path: '/auth/register' },
];

// Devices to test
const devices = [
  { name: 'Desktop', width: 1280, height: 800 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 },
];

test.describe('Visual regression testing', () => {
  for (const page of pages) {
    for (const device of devices) {
      test(`${page.name} page on ${device.name}`, async ({ page: pageObj }) => {
        // Set viewport size
        await pageObj.setViewportSize({ width: device.width, height: device.height });

        // Navigate to the page
        await pageObj.goto(page.path);

        // Wait for any animations/loading to complete
        await pageObj.waitForTimeout(500);

        // Take a screenshot
        await expect(pageObj).toHaveScreenshot(`${page.name}-${device.name}.png`, {
          fullPage: true,
          // Use a high threshold for comparison to avoid false positives
          threshold: 0.2,
        });
      });
    }
  }
});
