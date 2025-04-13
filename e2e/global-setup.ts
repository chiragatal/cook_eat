import { chromium, FullConfig } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { resetDatabase, loginAsTestUser } from './utils/test-utils';
import { createTestTag } from './utils/test-tag';
import { getBaseUrl, PAGE_URLS } from './utils/urls';

/**
 * Global setup runs once before all tests
 * Used to set up any global state or data needed for tests
 */
async function globalSetup(config: FullConfig) {
  // Create a test tag for global setup
  const testTag = createTestTag('global', 'setup');

  // Get base URL from centralized configuration
  const baseURL = getBaseUrl();

  // Create browser instance
  const browser = await chromium.launch();

  // Create page with base URL configuration
  const page = await browser.newPage({
    baseURL,
  });

  // Create screenshot helper for global setup
  const screenshots = new ScreenshotHelper(page, testTag);

  try {
    // Reset database to known state
    await resetDatabase();

    // Navigate to home page and verify it loads
    await page.goto(PAGE_URLS.home);
    await page.waitForLoadState('networkidle');
    await screenshots.take('home-page');

    // Log successful setup
    console.log('Global setup complete');
    console.log(`Using base URL: ${baseURL}`);
    console.log('Test database reset');
  } catch (error) {
    console.error('Error in global setup:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
