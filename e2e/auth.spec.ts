import { test, expect } from '@playwright/test';

test.describe('Authentication flows', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/auth/login');

    // Check for login form elements
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Login|Sign in/i })).toBeVisible();
  });

  test('signup page loads correctly', async ({ page }) => {
    await page.goto('/auth/register');

    // Check for signup form elements
    await expect(page.getByLabel(/Name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign up|Register/i })).toBeVisible();
  });

  test('login error is displayed for incorrect credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in incorrect credentials
    await page.getByLabel(/Email/i).fill('nonexistent@example.com');
    await page.getByLabel(/Password/i).fill('wrongpassword');

    // Submit the form
    await page.getByRole('button', { name: /Login|Sign in/i }).click();

    // Check for error message
    // Note: The exact error message will depend on your implementation
    await expect(page.getByText(/invalid|incorrect|wrong|failed/i)).toBeVisible();
  });

  test('login page displays correctly on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/auth/login');

    // Check that form elements are properly sized for mobile
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();

    // Form should fit within the viewport
    const form = page.locator('form');
    const formBoundingBox = await form.boundingBox();

    // The form should fit within the viewport width
    expect(formBoundingBox?.width).toBeLessThanOrEqual(375);
  });
});
