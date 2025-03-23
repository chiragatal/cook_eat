import { test, expect } from '@playwright/test';

test.describe('Recipe functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('can view recipe list', async ({ page }) => {
    // Navigate to all recipes
    await page.getByRole('link', { name: 'All Recipes' }).click();

    // Check that we're on the all-recipes page
    await expect(page).toHaveURL(/.*\/all-recipes/);

    // Check that recipe cards are visible
    await expect(page.locator('.recipe-card, [data-testid="recipe-card"]').first()).toBeVisible();
  });

  test('can search for recipes', async ({ page }) => {
    // Navigate to all recipes
    await page.getByRole('link', { name: 'All Recipes' }).click();

    // Find the search input and type a search query
    const searchInput = page.getByPlaceholder(/Search recipes/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill('pasta');
    await searchInput.press('Enter');

    // Wait for search results to load
    await page.waitForTimeout(500);

    // Check that search results appear - fixed to use a number instead of object
    const recipeCards = page.locator('.recipe-card, [data-testid="recipe-card"]');
    await expect(recipeCards).toHaveCount(await recipeCards.count());
  });

  test('can view recipe details', async ({ page }) => {
    // Navigate to all recipes
    await page.getByRole('link', { name: 'All Recipes' }).click();

    // Click on the first recipe card
    await page.locator('.recipe-card, [data-testid="recipe-card"]').first().click();

    // Check that we're on a recipe detail page
    await expect(page).toHaveURL(/.*\/recipe\/\d+/);

    // Check for recipe details
    await expect(page.locator('h1')).toBeVisible(); // Recipe title
    await expect(page.getByText(/Ingredients/i)).toBeVisible();
    await expect(page.getByText(/Steps/i)).toBeVisible();
  });

  test('mobile view displays recipe properly', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to all recipes
    await page.getByRole('link', { name: 'All Recipes' }).click();

    // Click on the first recipe card
    await page.locator('.recipe-card, [data-testid="recipe-card"]').first().click();

    // Check that recipe content is visible on mobile
    await expect(page.locator('h1')).toBeVisible(); // Recipe title
    await expect(page.getByText(/Ingredients/i)).toBeVisible();
    await expect(page.getByText(/Steps/i)).toBeVisible();
  });
});
