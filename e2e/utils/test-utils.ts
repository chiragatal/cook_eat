import { Page, expect } from '@playwright/test';
import { resetTestDatabase } from '../setup/test-database';
import path from 'path';
import fs from 'fs';

// Ensure screenshots directory exists
const screenshotsDir = path.join(process.cwd(), 'screenshots');
const screenshotsDebugDir = path.join(screenshotsDir, 'debug');

// Create directories if they don't exist
[screenshotsDir, screenshotsDebugDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Login with the test user account
 */
export async function loginAsTestUser(page: Page) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password12345');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/*');
}

/**
 * Reset the database to the initial test state
 * Can be used before tests that need a clean slate
 */
export async function resetDatabase() {
  await resetTestDatabase();
}

/**
 * Navigate to a recipe by clicking the first recipe with the given title
 */
export async function navigateToRecipe(page: Page, title: string) {
  await page.goto('/recipes');

  // Find and click the recipe with the given title
  const recipeCard = page.locator('.recipe-card', { hasText: title }).first();
  await recipeCard.click();

  // Verify we're on a recipe detail page
  await expect(page.locator('h1')).toBeVisible();
}

/**
 * Wait for network requests to complete
 * Useful after form submissions
 */
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Take a snapshot for visual regression testing
 */
export async function takeSnapshot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(`${name}.png`);
}

/**
 * Take a debug screenshot and save it directly to the screenshots/debug directory
 */
export async function takeDebugScreenshot(page: Page, name: string) {
  // Ensure filename is safe for all filesystems
  const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `${safeName}-${new Date().getTime()}.png`;
  const filePath = path.join(screenshotsDebugDir, filename);

  await page.screenshot({ path: filePath });
  console.log(`Debug screenshot saved to: ${filePath}`);
  return filePath;
}

/**
 * Check for common UI elements that should be present in most pages
 */
export async function verifyCommonElements(page: Page) {
  // Header/Navigation should be present
  await expect(page.locator('header')).toBeVisible();

  // Footer should be present
  await expect(page.locator('footer')).toBeVisible();
}

/**
 * Helper to resize the browser for different device tests
 */
export async function resizeForDevice(page: Page, device: 'desktop' | 'tablet' | 'mobile') {
  switch (device) {
    case 'desktop':
      await page.setViewportSize({ width: 1280, height: 800 });
      break;
    case 'tablet':
      await page.setViewportSize({ width: 768, height: 1024 });
      break;
    case 'mobile':
      await page.setViewportSize({ width: 375, height: 667 });
      break;
  }
}
