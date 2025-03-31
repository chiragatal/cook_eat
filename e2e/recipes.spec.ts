import { test, expect } from '@playwright/test';

test.describe('Recipe Functionality', () => {
  // Set up for tests
  test.beforeEach(async ({ page }) => {
    await page.goto('/recipes');
  });

  test('can view recipe list', async ({ page }) => {
    // Check that the recipe list loads
    await expect(page.getByRole('heading', { name: 'All Recipes' })).toBeVisible();

    // There should be at least one recipe card
    const recipeCards = page.locator('.recipe-card');
    await expect(recipeCards.first()).toBeVisible();
  });

  test('can search for recipes', async ({ page }) => {
    // Get original recipe count
    const initialRecipeCount = await page.locator('.recipe-card').count();

    // Type in the search box
    const searchInput = page.getByPlaceholder('Search recipes...');
    await searchInput.fill('pasta');
    await searchInput.press('Enter');

    // Wait for search results to update
    await page.waitForTimeout(1000);

    // The search should filter results
    const filteredRecipeCount = await page.locator('.recipe-card').count();

    // Either we have fewer recipes, or the same number if all recipes match
    expect(filteredRecipeCount).toBeLessThanOrEqual(initialRecipeCount);

    // Clear the search
    await searchInput.fill('');
    await searchInput.press('Enter');

    // Wait for results to reset
    await page.waitForTimeout(1000);

    // Should be back to original count
    const resetCount = await page.locator('.recipe-card').count();
    expect(resetCount).toEqual(initialRecipeCount);
  });

  test('can view recipe details', async ({ page }) => {
    // Click on the first recipe
    await page.locator('.recipe-card').first().click();

    // We should be taken to a detail page
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Ingredients')).toBeVisible();
  });

  test('mobile view displays recipe properly', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify that the mobile menu is visible
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

    // Recipe cards should be stacked in mobile view
    const recipeCards = page.locator('.recipe-card');
    for (let i = 0; i < await recipeCards.count(); i++) {
      await expect(recipeCards.nth(i)).toBeVisible();
    }

    // Click on a recipe
    await recipeCards.first().click();

    // Recipe detail view should be properly formatted for mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Ingredients')).toBeVisible();
  });

  test('mobile navigation menu works correctly', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Hamburger menu should be visible
    const menuButton = page.getByRole('button', { name: 'Menu' });
    await expect(menuButton).toBeVisible();

    // Open the menu
    await menuButton.click();

    // Navigation links should be visible
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'All Recipes' })).toBeVisible();

    // Click on a menu item
    await page.getByRole('link', { name: 'Home' }).click();

    // Should navigate to the home page
    await expect(page).toHaveURL(/\/$/);
  });

  test('recipe search works on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Find and expand search if it's collapsed on mobile
    const searchToggle = page.getByRole('button', { name: 'Search' });
    if (await searchToggle.isVisible()) {
      await searchToggle.click();
    }

    // Fill the search input
    const searchInput = page.getByPlaceholder('Search recipes...');
    await searchInput.fill('pasta');
    await searchInput.press('Enter');

    // Wait for search results
    await page.waitForTimeout(1000);

    // Should show search results
    const recipeCards = page.locator('.recipe-card');
    if (await recipeCards.count() > 0) {
      await expect(recipeCards.first()).toBeVisible();
    } else {
      // If no results, should show "No recipes found"
      await expect(page.getByText(/no recipes found/i)).toBeVisible();
    }
  });

  test('can interact with recipe card dropdown menu on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Find the first recipe card
    const firstRecipeCard = page.locator('.recipe-card').first();
    await expect(firstRecipeCard).toBeVisible();

    // Find and click the card menu button (3 dots) if it exists
    const menuButton = firstRecipeCard.locator('button[aria-label="Options"]');
    if (await menuButton.count() > 0) {
      await menuButton.click();

      // Menu items should be visible
      const menuItems = page.locator('[role="menuitem"]');
      if (await menuItems.count() > 0) {
        await expect(menuItems.first()).toBeVisible();

        // Click outside to dismiss the menu
        await page.mouse.click(10, 10);

        // Menu should be closed
        await expect(menuItems.first()).not.toBeVisible();
      }
    }
  });

  test('recipe details page is properly responsive', async ({ page }) => {
    // Navigate to a recipe details page
    await page.locator('.recipe-card').first().click();

    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('h1')).toBeVisible();

    // Capture desktop layout
    const desktopImagePosition = await page.locator('.image-carousel').boundingBox();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toBeVisible();

    // Test mobile phone view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();

    // Capture mobile layout
    const mobileImagePosition = await page.locator('.image-carousel').boundingBox();

    // Layout should change between desktop and mobile
    if (desktopImagePosition && mobileImagePosition) {
      // Check if the positions/dimensions are different in responsive design
      expect(desktopImagePosition.x !== mobileImagePosition.x ||
             desktopImagePosition.width !== mobileImagePosition.width).toBeTruthy();
    }
  });
});
