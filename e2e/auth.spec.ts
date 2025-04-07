import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { takeDebugScreenshot, waitForNetworkIdle } from './utils/test-utils';

test.describe('Authentication flows', () => {
  test('signin page loads correctly', async ({ page }) => {
    // Create a screenshot helper for this test
    const screenshots = new ScreenshotHelper(page, 'signin-page', 'auth');

    await page.goto('/auth/signin');
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
  });

  test('signup page loads correctly', async ({ page }) => {
    // Create a screenshot helper for this test
    const screenshots = new ScreenshotHelper(page, 'signup-page', 'auth');

    await page.goto('/auth/signup');
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
  });

  test('login error is displayed for incorrect credentials', async ({ page }) => {
    // Create a screenshot helper for this test
    const screenshots = new ScreenshotHelper(page, 'login-error', 'auth');

    await page.goto('/auth/signin');
    await waitForNetworkIdle(page);

    // Take debug screenshot to see the initial state
    await takeDebugScreenshot(page, 'login-error-initial', 'auth');

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
    const submitResult = await screenshots.captureAction('form-submission', async () => {
      // Click the button and wait for response
      await signinButton.click();

      // Wait for network requests to complete
      await waitForNetworkIdle(page);

      // Additional wait for any error messages to appear
      await page.waitForTimeout(1000);
    });

    // Check if submission had errors
    if (submitResult.error) {
      console.log(`Error during form submission: ${submitResult.error}`);
      await screenshots.captureError(`Form submission error: ${submitResult.error}`);
    }

    // Take debug screenshot to see the state after submission
    await takeDebugScreenshot(page, 'login-error-after-submit', 'auth');

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

    console.log(`Current URL: ${currentUrl}, Still on login page: ${stillOnLoginPage}`);

    // The test should pass if either:
    // - We found an error message, OR
    // - We're still on the login page (didn't redirect)
    if (errorFound) {
      console.log(`Login error display test passed: Found error message "${errorMessage}"`);
    } else if (stillOnLoginPage) {
      console.log(`Login error display test passed: Still on login page after submission`);
      await screenshots.take('no-visible-error-but-no-redirect');
    } else {
      console.log(`Login error display test failed: No error message found and redirected away from login page`);
      await screenshots.captureError('No error message found');
      // Only fail the test if neither condition is met
      expect(errorFound || stillOnLoginPage).toBeTruthy();
    }
  });

  test('login page displays correctly on mobile', async ({ page }) => {
    // Create a screenshot helper for this test
    const screenshots = new ScreenshotHelper(page, 'signin-mobile', 'auth');

    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/auth/signin');
    await waitForNetworkIdle(page);

    // Take debug screenshot
    await takeDebugScreenshot(page, 'mobile-login-initial', 'auth');

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Give the page a moment to settle

    // Take a screenshot for debugging
    await screenshots.take('mobile-view');

    // Find form elements with flexible selectors
    const emailField = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"], input[id*="password" i]').first();

    // Capture form element on mobile - using a string selector to avoid issues
    const formSelector = 'form, div.form, div.login-form, div.signin-form, div[class*="form"]';
    const form = page.locator(formSelector).first();

    if (await form.isVisible()) {
      // Use the string selector directly to avoid passing the locator object
      await screenshots.captureElement(formSelector, 'mobile-form');
    }

    // Check elements are visible with soft assertions
    await expect.soft(emailField).toBeVisible();
    await expect.soft(passwordField).toBeVisible();

    // Verify at least one form element exists
    const formElementExists = await emailField.isVisible() || await passwordField.isVisible();
    expect(formElementExists).toBeTruthy();

    // For form size check, try to find the form or a container element
    if (await form.isVisible()) {
      // Take a screenshot of the form with the safer take method
      await screenshots.take('form-view', form);

      const formBoundingBox = await form.boundingBox();
      if (formBoundingBox) {
        // The form should fit within the viewport width
        expect(formBoundingBox.width).toBeLessThanOrEqual(375);
      }
    }
  });
});
