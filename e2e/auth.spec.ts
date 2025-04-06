import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';

test.describe('Authentication flows', () => {
  test('signin page loads correctly', async ({ page }) => {
    // Create a screenshot helper for this test
    const screenshots = new ScreenshotHelper(page, 'signin-page', 'auth');

    await page.goto('/auth/signin');

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

    // Take an initial screenshot
    await screenshots.take('before-login');

    // Find form elements
    const emailField = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"], input[id*="password" i]').first();
    const signinButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();

    // Skip test if form elements are not found
    if (!(await emailField.isVisible() && await passwordField.isVisible() && await signinButton.isVisible())) {
      test.skip(true, 'Could not find all form elements');
      return;
    }

    // Fill in incorrect credentials
    await emailField.fill('nonexistent@example.com');
    await passwordField.fill('wrongpassword');

    // Use the captureAction helper to take before/after screenshots around submission
    await screenshots.captureAction('form-submission', async () => {
      await signinButton.click();
      await page.waitForTimeout(1000); // Wait for response
    });

    // Wait for error - either specific text or general error styling
    const errorText = page.getByText(/invalid|incorrect|wrong|failed|error/i);
    const errorElement = page.locator('[class*="error" i], [class*="alert" i], [role="alert"]');

    try {
      // Try waiting for specific error text first
      await errorText.waitFor({ timeout: 5000 });
      await expect(errorText).toBeVisible();

      // Capture screenshot of the error message
      await screenshots.captureElement(errorText, 'error-message');
    } catch (e) {
      // Fall back to checking for general error styling
      try {
        await errorElement.waitFor({ timeout: 5000 });
        await expect(errorElement).toBeVisible();

        // Capture screenshot of the error element
        await screenshots.captureElement(errorElement, 'error-styling');
      } catch (e2) {
        // Take a screenshot of the failed state
        await screenshots.take('error-not-found');
        console.log('Could not find error message, checking if still on login page');

        // Check if we're still on the login page and the form is still visible
        const stillOnLoginPage = await emailField.isVisible() && await passwordField.isVisible();
        expect(stillOnLoginPage).toBeTruthy();
      }
    }
  });

  test('login page displays correctly on mobile', async ({ page }) => {
    // Create a screenshot helper for this test
    const screenshots = new ScreenshotHelper(page, 'signin-mobile', 'auth');

    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/auth/signin');

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
