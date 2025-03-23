import { test, expect } from '@playwright/test';

test('home page loads successfully', async ({ page }) => {
  await page.goto('/');

  // Check that the page title is correct
  await expect(page).toHaveTitle(/Cook-Eat/);

  // Check for the navigation bar
  await expect(page.locator('nav')).toBeVisible();

  // Check for the logo
  await expect(page.getByText('Cook-Eat')).toBeVisible();
});

test('navigation links work correctly', async ({ page }) => {
  await page.goto('/');

  // Check that clicking on "My Recipes" navigates to the right page
  await page.getByRole('link', { name: 'My Recipes' }).click();
  await expect(page).toHaveURL(/.*\/my-recipes/);

  // Check that clicking on "All Recipes" navigates to the right page
  await page.getByRole('link', { name: 'All Recipes' }).click();
  await expect(page).toHaveURL(/.*\/all-recipes/);
});

test('responsive design works on mobile', async ({ page }) => {
  // Set viewport to mobile size
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/');

  // Check that the mobile menu button is visible
  const menuButton = page.locator('button[aria-label="Toggle menu"]');
  await expect(menuButton).toBeVisible();

  // Open mobile menu
  await menuButton.click();

  // Check that menu items are now visible
  await expect(page.getByRole('link', { name: 'My Recipes' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'All Recipes' })).toBeVisible();
});
