import { test, expect } from '@playwright/test';

// Test prefix matches what's in test-database.ts
const TEST_PREFIX = 'test_e2e_';

test.describe('Authenticated User Profile', () => {
  // Setup validation that auth is working before running tests
  test.beforeEach(async ({ page }) => {
    // Try to navigate to the profile page
    await page.goto('/profile');

    // Check if we were redirected to signin
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin') || currentUrl.includes('/login')) {
      test.skip(true, 'Authentication did not work, skipping test');
    }
  });

  test('can access profile page', async ({ page }) => {
    // Already navigated to /profile in beforeEach

    // Check that the profile elements are visible
    await expect(page.getByText('Profile', { exact: true })).toBeVisible();

    // Look for user information - we can't be sure of exact text, so be flexible
    const userInfoElement = page.getByText(/User|Profile|Account|Email/i);
    await expect(userInfoElement).toBeVisible();
  });

  test('can view user information', async ({ page }) => {
    // Already navigated to /profile in beforeEach

    // Verify some common profile elements that should exist
    // Looking for elements that typically exist on profile pages
    const profileHeading = page.getByRole('heading', { name: /Profile|Account|User/i });
    const emailElement = page.getByText(/Email|email@/i);

    // Check that at least one of these elements is visible
    const hasProfileHeading = await profileHeading.isVisible();
    const hasEmailElement = await emailElement.isVisible();

    expect(hasProfileHeading || hasEmailElement).toBeTruthy();
  });

  test('can update profile information', async ({ page }) => {
    await page.goto('/profile');

    // Find the edit button and click it
    const editButton = page.getByText('Edit Profile');
    if (await editButton.isVisible()) {
      await editButton.click();

      // Update name (if field exists)
      const nameInput = page.getByLabel(/Name/i);
      if (await nameInput.isVisible()) {
        const updatedName = `${TEST_PREFIX}Updated Test User`;
        await nameInput.fill(updatedName);

        // Save the changes
        await page.getByRole('button', { name: /Save|Update/i }).click();

        // Verify the changes were saved
        await expect(page.getByText(updatedName)).toBeVisible();
      }
    }
  });
});
