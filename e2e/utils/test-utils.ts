import { Page, expect } from '@playwright/test';
import { setupTestDatabase } from '../setup/test-database';
import path from 'path';
import fs from 'fs';
import { ScreenshotHelper } from './screenshot-helper';

// Ensure screenshots directory exists
const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
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
  // Create screenshot helper for login
  const screenshots = new ScreenshotHelper(page, 'login-test-user', 'auth');

  await page.goto('/auth/login');
  await screenshots.take('login-page');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password12345');

  // Capture the form submission with before/after screenshots
  await screenshots.captureAction('login-submission', async () => {
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*');
  });
}

/**
 * Setup test data in the database
 * Sets up consistent test data for tests that need it
 */
export async function resetDatabase() {
  // Just directly call setupTestDatabase instead of a reset function that no longer exists
  await setupTestDatabase();
  console.log('Test database setup complete');
}

/**
 * Navigate to a recipe by clicking the first recipe with the given title
 */
export async function navigateToRecipe(page: Page, title: string) {
  // Create screenshot helper for recipe navigation
  const screenshots = new ScreenshotHelper(page, 'recipe-navigation', 'recipes');

  await page.goto('/recipes');
  await screenshots.take('recipe-list');

  // Find and click the recipe with the given title
  const recipeCard = page.locator('.recipe-card', { hasText: title }).first();

  // Capture element if visible
  if (await recipeCard.isVisible()) {
    await screenshots.captureElement('.recipe-card', 'recipe-card');
  }

  // Capture the click and navigation
  await screenshots.captureAction('recipe-click', async () => {
    await recipeCard.click();
    await page.waitForLoadState('networkidle');
  });

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
 * Updated to use ScreenshotHelper
 */
export async function takeDebugScreenshot(page: Page, name: string, category: string = 'debug') {
  // Create screenshot helper for debug screenshots
  const screenshots = new ScreenshotHelper(page, name, category);

  // Take the screenshot with a standardized name
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = await screenshots.take(`debug-${timestamp}`);

  return screenshotPath;
}

/**
 * Check for common UI elements that should be present in most pages
 */
export async function verifyCommonElements(page: Page) {
  // Create screenshot helper for common elements
  const screenshots = new ScreenshotHelper(page, 'common-elements', 'layout');

  // Header/Navigation should be present
  const header = page.locator('header');
  await expect(header).toBeVisible();

  // Capture header screenshot
  if (await header.isVisible()) {
    await screenshots.captureElement('header', 'header');
  }

  // Footer should be present
  const footer = page.locator('footer');
  await expect(footer).toBeVisible();

  // Capture footer screenshot
  if (await footer.isVisible()) {
    await screenshots.captureElement('footer', 'footer');
  }
}

/**
 * Helper to resize the browser for different device tests
 */
export async function resizeForDevice(page: Page, device: 'desktop' | 'tablet' | 'mobile') {
  // Create screenshot helper for responsive testing
  const screenshots = new ScreenshotHelper(page, `responsive-${device}`, 'responsive');

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

  // Take screenshot after resize
  await screenshots.take(`after-resize-${device}`);
}
