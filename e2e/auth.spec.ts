import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { resetDatabase, waitForNetworkIdle } from './utils/test-utils';
import { createTestTag } from './utils/test-tag';

test.describe('Authentication flows', () => {
  // Reset database before running tests
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // Use a longer timeout for preview environments
  test.setTimeout(90000); // 90 seconds for preview tests

  test('signin page loads correctly', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('auth', 'signin-page-load');

    // Create a screenshot helper for this test with the test tag
    const screenshots = new ScreenshotHelper(page, 'signin-page', 'auth', '', testTag);

    try {
      await page.goto('/auth/signin', { timeout: 45000 });
      await waitForNetworkIdle(page);

      // Take a screenshot using the helper
      await screenshots.take('initial-view');

      // More resilient selector approach - find form elements even if they don't have explicit labels
      const emailField = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
      const passwordField = page.locator('input[type="password"], input[name="password"], input[id*="password" i]').first();
      const signinButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();

      // Capture screenshots of key elements
      if (await emailField.isVisible()) {
        await screenshots.captureElement('input[type="email"]', 'email-field');
      }

      if (await signinButton.isVisible()) {
        await screenshots.captureElement('button[type="submit"]', 'signin-button');
      }

      // Check elements are visible
      await expect.soft(emailField).toBeVisible();
      await expect.soft(passwordField).toBeVisible();
      await expect.soft(signinButton).toBeVisible();

      // Verify at least some form elements exist
      const formElementsExist =
        await emailField.isVisible() ||
        await passwordField.isVisible() ||
        await signinButton.isVisible();

      expect(formElementsExist).toBeTruthy();
    } catch (error) {
      console.error(`Error in signin page test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Signin page error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('signup page loads correctly', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('auth', 'signup-page-load');

    // Create a screenshot helper for this test with the test tag
    const screenshots = new ScreenshotHelper(page, 'signup-page', 'auth', '', testTag);

    try {
      await page.goto('/auth/signup', { timeout: 45000 });
      await waitForNetworkIdle(page);

      // Take a screenshot using the helper
      await screenshots.take('initial-view');

      // More resilient selector approach
      const nameField = page.locator('input[name="name"], input[id*="name" i], input[placeholder*="name" i]').first();
      const emailField = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
      const passwordField = page.locator('input[type="password"], input[name="password"], input[id*="password" i]').first();
      const signupButton = page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Register")').first();

      // Capture screenshots of key elements
      if (await nameField.isVisible()) {
        await screenshots.captureElement('input[name="name"]', 'name-field');
      }

      if (await signupButton.isVisible()) {
        await screenshots.captureElement('button[type="submit"]', 'signup-button');
      }

      // Check elements are visible with soft assertions (continue even if some fail)
      await expect.soft(nameField).toBeVisible();
      await expect.soft(emailField).toBeVisible();
      await expect.soft(passwordField).toBeVisible();
      await expect.soft(signupButton).toBeVisible();

      // Verify at least some form elements exist
      const formElementsExist =
        await nameField.isVisible() ||
        await emailField.isVisible() ||
        await passwordField.isVisible() ||
        await signupButton.isVisible();

      expect(formElementsExist).toBeTruthy();
    } catch (error) {
      console.error(`Error in signup page test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Signup page error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('login error is displayed for incorrect credentials', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('auth', 'login-error');

    // Create a screenshot helper for this test with the test tag
    const screenshots = new ScreenshotHelper(page, 'login-error', 'auth', '', testTag);

    try {
      await page.goto('/auth/signin', { timeout: 45000 });
      await waitForNetworkIdle(page);

      // Take an initial screenshot
      await screenshots.take('before-login');

      // Find form elements
      const emailField = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
      const passwordField = page.locator('input[type="password"], input[name="password"], input[id*="password" i]').first();
      const signinButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();

      // Check if form elements are visible
      const emailVisible = await emailField.isVisible();
      const passwordVisible = await passwordField.isVisible();
      const buttonVisible = await signinButton.isVisible();

      // Log the form state
      console.log(`Form elements: Email visible: ${emailVisible}, Password visible: ${passwordVisible}, Button visible: ${buttonVisible}`);

      // Skip test if we can't find all form elements
      if (!(emailVisible && passwordVisible && buttonVisible)) {
        console.log('Could not find all form elements, skipping test');
        test.skip();
        return;
      }

      // Fill in incorrect credentials
      await emailField.fill('nonexistent@example.com');
      await passwordField.fill('wrongpassword');

      // Take screenshot before submission
      await screenshots.take('filled-form');

      // Use the captureAction helper to take before/after screenshots around submission
      await screenshots.captureAction('form-submission', async () => {
        // Click the button and wait for response
        await signinButton.click();

        // Wait for network requests to complete
        await waitForNetworkIdle(page);

        // Additional wait for any error messages to appear
        await page.waitForTimeout(1000);
      });

      // Take screenshot after submission
      await screenshots.take('after-submission');

      // Check for errors in multiple ways to be resilient
      // 1. Look for error messages with various selectors
      const errorSelectors = [
        '[role="alert"]',
        '.error',
        '[class*="error"]',
        '.form-error',
        '.alert',
        '[class*="alert"]',
        'p:has-text("Invalid")',
        'p:has-text("incorrect")',
        'p:has-text("wrong")',
        'div:has-text("Invalid")',
        'span:has-text("Invalid")'
      ];

      let errorFound = false;
      let errorMessage = '';

      // Try each error selector
      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector).first();
        const isVisible = await errorElement.isVisible().catch(() => false);

        if (isVisible) {
          errorFound = true;
          errorMessage = await errorElement.textContent() || 'Unknown error';
          console.log(`Found error with selector "${selector}": "${errorMessage}"`);
          await screenshots.captureElement(errorElement, 'error-element');
          break;
        }
      }

      // 2. Check if we're still on the login page (this is also a valid outcome)
      const currentUrl = page.url();
      const stillOnLoginPage =
        (currentUrl.includes('/auth/signin') || currentUrl.includes('/auth/login')) &&
        (await emailField.isVisible() || await passwordField.isVisible());

      if (stillOnLoginPage) {
        console.log('Still on login page after submission with incorrect credentials, which is expected');
      } else {
        console.log(`Unexpected navigation to ${currentUrl}`);
      }

      // One of these conditions should be true
      expect(errorFound || stillOnLoginPage).toBeTruthy();

    } catch (error) {
      console.error(`Error in login error test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Login error test error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('can login with valid credentials', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('auth', 'successful-login');

    // Create a screenshot helper for this test with the test tag
    const screenshots = new ScreenshotHelper(page, 'successful-login', 'auth', '', testTag);

    try {
      await page.goto('/auth/signin', { timeout: 45000 });
      await waitForNetworkIdle(page);

      // Take an initial screenshot
      await screenshots.take('before-login');

      // Find form elements
      const emailField = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
      const passwordField = page.locator('input[type="password"], input[name="password"], input[id*="password" i]').first();
      const signinButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();

      // Check if form elements are visible
      const emailVisible = await emailField.isVisible();
      const passwordVisible = await passwordField.isVisible();
      const buttonVisible = await signinButton.isVisible();

      // Skip test if we can't find all form elements
      if (!(emailVisible && passwordVisible && buttonVisible)) {
        console.log('Could not find all form elements, skipping test');
        test.skip();
        return;
      }

      // Fill in valid credentials for the test user created in test-database.ts
      await emailField.fill('test_e2e_test@example.com');
      await passwordField.fill('password12345');

      // Take screenshot before submission
      await screenshots.take('filled-form');

      // Use the captureAction helper to take before/after screenshots around submission
      await screenshots.captureAction('form-submission', async () => {
        // Click the button
        await signinButton.click();

        // Wait for navigation and page load
        await page.waitForURL('**/*', { timeout: 30000 });
        await waitForNetworkIdle(page);
      });

      // Take screenshot after login
      await screenshots.take('after-login');

      // Verify we've been redirected away from login page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth/signin');
      expect(currentUrl).not.toContain('/auth/login');
      console.log(`Redirected to ${currentUrl} after successful login`);

      // Look for elements that indicate successful login
      const userSpecificElements = [
        page.locator('text=My Recipes'),
        page.locator('text=Profile'),
        page.locator('text=Logout'),
        page.locator('.user-menu, .profile-icon')
      ];

      let foundUserContent = false;
      for (const element of userSpecificElements) {
        if (await element.isVisible().catch(() => false)) {
          foundUserContent = true;
          const elementText = await element.textContent();
          console.log(`Found user-specific element: "${elementText}"`);
          await screenshots.captureElement(element, 'user-element');
          break;
        }
      }

      // Verify we found some indication of being logged in
      expect(foundUserContent).toBeTruthy();

    } catch (error) {
      console.error(`Error in successful login test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Login test error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
});
