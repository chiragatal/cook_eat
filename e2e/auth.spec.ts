import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { resetDatabase, waitForNetworkIdle, loginAsTestUser } from './utils/test-utils';
import { createTestTag } from './utils/test-tag';
import { setupTestDatabase } from './setup/test-database';
import { PAGE_URLS } from './utils/urls';

test.describe('Authentication flows', () => {
  // Reset database before running tests
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // Use a longer timeout for preview environments
  test.setTimeout(90000); // 90 seconds for preview tests

  test('signin page loads correctly', async ({ page }) => {
    const testTag = createTestTag('auth', 'signin-page-load');
    const screenshots = new ScreenshotHelper(page, testTag, 'auth');
    await setupTestDatabase(testTag);

    await page.goto(PAGE_URLS.login);
    await page.waitForLoadState('networkidle');
    await screenshots.take('signin-page');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });

  test('signup page loads correctly', async ({ page }) => {
    const testTag = createTestTag('auth', 'signup-page-load');
    const screenshots = new ScreenshotHelper(page, testTag, 'auth');
    await setupTestDatabase(testTag);

    await page.goto(PAGE_URLS.signup);
    await page.waitForLoadState('networkidle');
    await screenshots.take('signup-page');
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();
  });

  test('login error is displayed for incorrect credentials', async ({ page }) => {
    const testTag = createTestTag('auth', 'login-error');
    const screenshots = new ScreenshotHelper(page, testTag, 'auth');
    await setupTestDatabase(testTag);

    // Navigate to login page
    await page.goto(PAGE_URLS.login);
    await page.waitForLoadState('networkidle');

    // Fill in incorrect credentials
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');

    // Take screenshot before submitting
    await screenshots.take('before-error');

    // Submit and wait for error
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Invalid email or password')).toBeVisible();

    // Take screenshot of error state
    await screenshots.take('error-shown');
  });

  test('can login with valid credentials', async ({ page }) => {
    const testTag = createTestTag('auth', 'successful-login');
    const screenshots = new ScreenshotHelper(page, testTag, 'auth');
    await setupTestDatabase(testTag);

    // Create safe prefix from test tag for email
    const safePrefix = testTag.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const testEmail = `test_e2e_${safePrefix}_test@example.com`;

    // Navigate to login page
    await page.goto(PAGE_URLS.login);
    await page.waitForLoadState('networkidle');
    await screenshots.take('login-form');

    // Fill in valid credentials
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password').fill('password12345');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for successful login
    await page.waitForURL('/', { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('user-menu')).toBeVisible();

    // Take screenshot of logged in state
    await screenshots.take('logged-in');
  });
});
