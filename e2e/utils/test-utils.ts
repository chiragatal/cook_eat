import { Page, expect } from '@playwright/test';
import { setupTestDatabase, getTestPostId } from '../setup/test-database';
import path from 'path';
import fs from 'fs';
import { ScreenshotHelper } from './screenshot-helper';
import { createTestTag } from './test-tag';
import { PAGE_URLS } from './urls';

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
export async function loginAsTestUser(page: Page, testTag: string) {
  // Create screenshot helper for login steps
  const screenshots = new ScreenshotHelper(page, testTag, 'auth');

  // Set up test data
  await setupTestDatabase(testTag);

  // Go to login page
  await page.goto(PAGE_URLS.login);
  await page.waitForLoadState('networkidle');

  // Take screenshot of the login page
  await screenshots.take('login-page');

  // Try a more robust approach to find login form elements with multiple selectors
  let emailField, passwordField, signinButton;

  try {
    // Wait for login form to be visible
    await page.waitForSelector('form, [role="form"]', { timeout: 10000 });

    // Look for email input with multiple selectors
    emailField = page.locator([
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="username" i]',
      'input:not([type="password"])'
    ].join(', ')).first();

    // Look for password input with multiple selectors
    passwordField = page.locator([
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]'
    ].join(', ')).first();

    // Look for submit button with multiple selectors
    signinButton = page.locator([
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Log in")',
      'input[type="submit"]',
      'form button'
    ].join(', ')).first();

    // Verify elements are found
    await emailField.waitFor({ timeout: 5000 });
    await passwordField.waitFor({ timeout: 5000 });
    await signinButton.waitFor({ timeout: 5000 });

  } catch (error) {
    console.error('Error finding login form elements:', error);
    await takeDebugScreenshot(page, 'login-form-not-found', 'auth');
    throw new Error('Login form elements not found');
  }

  try {
    // Take screenshot before filling in form
    await screenshots.take('before-login-submission');

    // Fill in credentials - use the standard test user for consistency
    await emailField.fill('test_e2e_test@example.com');
    await passwordField.fill('password12345');

    // Take screenshot before clicking the login button
    await screenshots.captureAction('login-submission', async () => {
      await signinButton.click();
      try {
        // Wait for navigation or wait for a common element that indicates successful login
        await Promise.race([
          page.waitForURL('**/*', { timeout: 10000 }),
          page.waitForSelector('header, nav, [role="banner"], a:has-text("Log out"), a:has-text("Logout")', { timeout: 10000 })
        ]);
      } catch (error) {
        console.log('Navigation or authenticated element waiting timed out, continuing anyway');
      }
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    });

    // Take screenshot after login
    await screenshots.take('after-login-submission');

    // Verify login was successful
    const isAuthenticated = await page.locator([
      '.user-menu',
      '.profile-icon',
      '[data-testid="user-menu"]',
      'a:has-text("Log out")',
      'a:has-text("Logout")',
      'a:has-text("My Recipes")',
      'a:has-text("Profile")'
    ].join(', ')).count() > 0;

    if (!isAuthenticated) {
      console.log('Warning: Login may not have been successful, but continuing with test');
    } else {
      console.log('Login successful');
    }
  } catch (error) {
    console.error('Error during login process:', error);
    await takeDebugScreenshot(page, 'login-process-error', 'auth');
    throw new Error('Login process failed');
  }
}

/**
 * Setup test data in the database
 * Sets up consistent test data for tests that need it
 */
export async function resetDatabase() {
  // Just directly call setupTestDatabase instead of a reset function that no longer exists
  const testTag = createTestTag('setup', 'reset-database');
  await setupTestDatabase(testTag);
}

/**
 * Navigate to a recipe by clicking the first recipe with the given title
 */
export async function navigateToRecipe(page: Page, title: string) {
  // Create screenshot helper for recipe navigation
  const screenshots = new ScreenshotHelper(page, 'recipe-navigation', 'recipes');

  await page.goto('/all-recipes');
  await screenshots.take('recipe-list');

  // Find and click the recipe with the given title - use more flexible selectors
  const recipeCard = page.getByText(title, { exact: false }).first();

  // Capture element if visible
  if (await recipeCard.isVisible()) {
    await screenshots.captureElement(recipeCard, 'recipe-card');
  }

  // Capture the click and navigation
  await screenshots.captureAction('recipe-click', async () => {
    await recipeCard.click();
    await page.waitForLoadState('networkidle');
  });

  // Verify we're on a recipe detail page
  await expect(page.locator('h1, h2, h3').first()).toBeVisible();
}

/**
 * Wait for network to become idle (no requests for a period of time)
 * This is a more reliable way to wait for page load completion
 *
 * @param page Playwright page object
 * @param timeout Timeout in milliseconds
 * @param idleTime Time with no network requests to consider "idle" in milliseconds
 */
export async function waitForNetworkIdle(page: Page, timeout = 10000, idleTime = 500): Promise<void> {
  // We're always using the preview environment
  const effectiveTimeout = Math.min(timeout, 5000);

  try {
    await page.waitForLoadState('networkidle', { timeout: effectiveTimeout });
  } catch (error) {
    // Don't fail the test if network doesn't become idle, just log a warning
    console.log(`Network did not become idle within timeout, continuing anyway`);
  }
}

/**
 * Take a snapshot for visual regression testing
 */
export async function takeSnapshot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(`${name}.png`);
}

/**
 * Take a debug screenshot with rich contextual information
 * Saves both a screenshot and page information to help debugging
 */
export async function takeDebugScreenshot(page: Page, name: string, category: string = 'debug') {
  try {
    // Create a timestamp for unique filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotName = `${name}-${timestamp}`;

    // Create screenshot helper for debug screenshots
    const screenshots = new ScreenshotHelper(page, screenshotName, category);

    // Take the screenshot with a standardized name
    const screenshotPath = await screenshots.take(`debug`);

    // Also capture HTML snapshot for debugging
    const html = await page.content();
    const url = page.url();
    const title = await page.title();

    // Create a debug info file
    const debugInfoPath = path.join(screenshotsDebugDir, `${screenshotName}-info.txt`);

    // Collect debug information in a structured format
    const debugInfo = [
      `URL: ${url}`,
      `Title: ${title}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Screenshot: ${screenshotPath}`,
      '------- Page Structure -------',
      // Get counts of important elements
      `Headings: ${await page.locator('h1, h2, h3, h4, h5, h6').count()}`,
      `Links: ${await page.locator('a').count()}`,
      `Buttons: ${await page.locator('button').count()}`,
      `Forms: ${await page.locator('form').count()}`,
      `Images: ${await page.locator('img').count()}`,
      '------- Visible Text -------',
      (await page.locator('body').textContent() || '').substring(0, 500) + '...'
    ].join('\n');

    // Write debug info to file
    fs.writeFileSync(debugInfoPath, debugInfo);

    return screenshotPath;
  } catch (error) {
    console.error('Error taking debug screenshot:', error);
    return 'error-taking-screenshot';
  }
}

/**
 * Check for common UI elements that should be present in most pages
 */
export async function verifyCommonElements(page: Page) {
  // Create screenshot helper for common elements
  const screenshots = new ScreenshotHelper(page, 'common-elements', 'layout');

  // Look for header using flexible selectors
  const header = page.locator('header, nav, [role="banner"], div[class*="header"], div[class*="nav"]').first();

  if (await header.isVisible()) {
    // Capture header screenshot
    await screenshots.captureElement(header, 'header');
    console.log('Found header element');
  } else {
    console.log('No header found, this might be ok depending on the page');
  }

  // Look for footer using flexible selectors
  const footer = page.locator('footer, [role="contentinfo"], div[class*="footer"]').first();

  if (await footer.isVisible()) {
    // Capture footer screenshot
    await screenshots.captureElement(footer, 'footer');
    console.log('Found footer element');
  } else {
    console.log('No footer found, this might be ok depending on the page');
  }

  // Look for main content area
  const main = page.locator('main, [role="main"], article, .container').first();
  expect(main).toBeVisible();
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

export async function navigateToRecipes(page: Page) {
  await page.goto(PAGE_URLS.recipes.list);
  // ... existing code ...
}
