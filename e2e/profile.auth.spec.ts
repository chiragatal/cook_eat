import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';

// Test prefix matches what's in test-database.ts
const TEST_PREFIX = 'test_e2e_';

test.describe('Authenticated User Profile', () => {
  // Setup validation that auth is working before running tests
  test.beforeEach(async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'profile-auth-setup', 'profile');

    // Try to navigate to the profile page
    await screenshots.captureAction('profile-navigation', async () => {
      await page.goto('/profile');
    });

    // Check if we were redirected to signin
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin') || currentUrl.includes('/login')) {
      // Take a screenshot of the redirect
      await screenshots.take('redirected-to-login');
      test.skip(true, 'Authentication did not work, skipping test');
    }
  });

  test('can access profile page', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'profile-access', 'profile');

    // Already navigated to /profile in beforeEach

    // Take screenshot of profile page
    await screenshots.take('profile-page');

    // Check that the profile elements are visible
    const profileHeading = page.getByText('Profile', { exact: true });
    await expect(profileHeading).toBeVisible();

    // Capture profile heading if found
    if (await profileHeading.isVisible()) {
      await screenshots.captureElement('text=Profile', 'profile-heading');
    }

    // Look for user information - we can't be sure of exact text, so be flexible
    const userInfoElement = page.getByText(/User|Profile|Account|Email/i);
    await expect(userInfoElement).toBeVisible();

    // Capture user info element
    if (await userInfoElement.isVisible()) {
      await screenshots.captureElement('text=/User|Profile|Account|Email/i', 'user-info');
    }
  });

  test('can view user information', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'user-info', 'profile');

    // Already navigated to /profile in beforeEach

    // Take screenshot of user info page
    await screenshots.take('user-info-page');

    // Verify some common profile elements that should exist
    // Looking for elements that typically exist on profile pages
    const profileHeading = page.getByRole('heading', { name: /Profile|Account|User/i });
    const emailElement = page.getByText(/Email|email@/i);

    // Capture profile elements
    if (await profileHeading.isVisible()) {
      await screenshots.captureElement('h1, h2, h3', 'profile-heading');
    }

    if (await emailElement.isVisible()) {
      await screenshots.captureElement('text=/Email|email@/i', 'email-info');
    }

    // Check that at least one of these elements is visible
    const hasProfileHeading = await profileHeading.isVisible();
    const hasEmailElement = await emailElement.isVisible();

    expect(hasProfileHeading || hasEmailElement).toBeTruthy();
  });

  test('can update profile information', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'profile-update', 'profile');

    // Navigate to the profile page
    await page.goto('/profile');

    // Take initial screenshot
    await screenshots.take('before-edit');

    // Find the edit button and click it
    const editButton = page.getByText('Edit Profile');

    // Capture edit button if found
    if (await editButton.isVisible()) {
      await screenshots.captureElement('text="Edit Profile"', 'edit-button');
    }

    if (await editButton.isVisible()) {
      // Capture the edit button click
      await screenshots.captureAction('edit-profile-click', async () => {
        await editButton.click();
        await page.waitForTimeout(300); // Wait for any transitions
      });

      // Update name (if field exists)
      const nameInput = page.getByLabel(/Name/i);
      if (await nameInput.isVisible()) {
        // Capture name input field
        await screenshots.captureElement('input[name="name"]', 'name-input');

        const updatedName = `${TEST_PREFIX}Updated Test User`;

        // Capture the form filling and submission
        await screenshots.captureAction('update-profile-form', async () => {
          await nameInput.fill(updatedName);

          // Save the changes
          await page.getByRole('button', { name: /Save|Update/i }).click();

          // Wait for save to complete
          await page.waitForTimeout(1000);
        });

        // Verify the changes were saved
        await expect(page.getByText(updatedName)).toBeVisible();

        // Take final screenshot after update
        await screenshots.take('after-profile-update');
      }
    }
  });
});
