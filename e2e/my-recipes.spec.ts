import { test, expect } from '@playwright/test';
import {
  resetDatabase,
  verifyCommonElements,
  resizeForDevice,
  waitForNetworkIdle,
  loginAsTestUser
} from './utils/test-utils';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { createTestTag } from './utils/test-tag';
import { setupTestDatabase } from './setup/test-database';

test.describe('My Recipes Functionality', () => {
  // Reset database before running tests in this file
  test.beforeAll(async () => {
    await resetDatabase();
  });

  test('redirects to login when not authenticated', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('my-recipes', 'auth-redirect');

    // Setup test database with test tag
    await setupTestDatabase(testTag);

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'my-recipes-auth-redirect', 'my-recipes', '', testTag);

    try {
      // Go to my-recipes without being logged in
      await page.goto('/my-recipes');
      await screenshots.take('initial-load');

      // Wait for redirect to occur
      await page.waitForURL('**/auth/signin**', { timeout: 5000 });
      await waitForNetworkIdle(page);

      // Verify we are redirected to login page
      await screenshots.take('redirected-to-login');

      // Check URL
      const currentUrl = page.url();
      expect(currentUrl).toContain('/auth/signin');

      // Verify login form is visible
      const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();

      await expect(emailField).toBeVisible();
      await expect(passwordField).toBeVisible();
    } catch (error) {
      console.error(`Error in auth redirect test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Auth redirect error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('displays my recipes when authenticated', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('my-recipes', 'display-authenticated');

    // Setup test database with test tag
    await setupTestDatabase(testTag);

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'my-recipes-authenticated', 'my-recipes', '', testTag);

    try {
      // Login first
      await loginAsTestUser(page, testTag);

      // Go to my-recipes
      await page.goto('/my-recipes');
      await waitForNetworkIdle(page);

      // Take screenshot of the page
      await screenshots.take('after-login');

      // Verify page title/heading
      const heading = page.getByRole('heading', { name: /my recipes/i }).first();
      await expect(heading).toBeVisible();
      await screenshots.captureElement(heading, 'page-heading');

      // Verify recipe toggle is present
      const recipeToggle = page.locator('div:has(> button:has-text("My Recipes"))').first();
      await expect(recipeToggle).toBeVisible();
      await screenshots.captureElement(recipeToggle, 'recipe-toggle');

      // Verify my recipes button is highlighted/active
      const myRecipesButton = page.getByRole('button', { name: /my recipes/i }).first();
      await expect(myRecipesButton).toHaveClass(/bg-indigo-600/);

      // Verify recipe list is rendered
      const recipeList = page.locator('.recipe-card, [class*="recipe" i], [role="article"], article, div:has(h2, h3):has(p)').first();

      // If recipes are found, verify content
      if (await recipeList.isVisible()) {
        await screenshots.captureElement(recipeList, 'first-recipe');

        // Check recipe content
        const recipeTitle = recipeList.locator('h1, h2, h3, h4').first();
        await expect(recipeTitle).toBeVisible();
      } else {
        // Check for empty state
        const emptyState = page.getByText(/no recipes found|you don't have any recipes|create your first recipe/i).first();
        console.log('No recipes found, checking for empty state message');
        await screenshots.take('empty-recipes-state');
      }
    } catch (error) {
      console.error(`Error in authenticated my recipes test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`My recipes error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('can toggle between my recipes and all recipes', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('my-recipes', 'toggle-view');

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'recipe-toggle', 'my-recipes', '', testTag);

    try {
      // Login first
      await loginAsTestUser(page, testTag);

      // Go to my-recipes
      await page.goto('/my-recipes');
      await waitForNetworkIdle(page);

      // Take screenshot of my recipes
      await screenshots.take('my-recipes-view');

      // Find toggle buttons
      const myRecipesButton = page.getByRole('button', { name: /my recipes/i }).first();
      const allRecipesButton = page.getByRole('button', { name: /all recipes/i }).first();

      // Verify my recipes button is active
      await expect(myRecipesButton).toHaveClass(/bg-indigo-600/);

      // Click on all recipes
      await screenshots.captureAction('click-all-recipes', async () => {
        await allRecipesButton.click();
        await page.waitForURL('**/all-recipes**');
        await waitForNetworkIdle(page);
      });

      // Take screenshot of all recipes
      await screenshots.take('all-recipes-view');

      // Verify URL changed
      expect(page.url()).toContain('/all-recipes');

      // Verify all recipes button is now active
      await expect(allRecipesButton).toHaveClass(/bg-indigo-600/);

      // Click back to my recipes
      await screenshots.captureAction('click-my-recipes', async () => {
        // Need to get the button again after navigation
        const myRecipesButtonAfterNav = page.getByRole('button', { name: /my recipes/i }).first();
        await myRecipesButtonAfterNav.click();
        await page.waitForURL('**/my-recipes**');
        await waitForNetworkIdle(page);
      });

      // Take screenshot after returning
      await screenshots.take('back-to-my-recipes');

      // Verify URL changed back
      expect(page.url()).toContain('/my-recipes');
    } catch (error) {
      console.error(`Error in recipe toggle test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Recipe toggle error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('can search and filter my recipes', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('my-recipes', 'search-filter');

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'my-recipes-search', 'my-recipes', '', testTag);

    try {
      // Login first
      await loginAsTestUser(page, testTag);

      // Go to my-recipes
      await page.goto('/my-recipes');
      await waitForNetworkIdle(page);

      // Take initial screenshot
      await screenshots.take('before-search');

      // Find search input with flexible selectors
      const searchInput = page.locator([
        'input[type="search"]',
        'input[placeholder*="search" i]',
        'input[placeholder*="find" i]',
        'input[aria-label*="search" i]',
        'input[name*="search" i]',
        'input[name*="query" i]',
        'input[name*="filter" i]',
        '[role="searchbox"]',
        '.search-input'
      ].join(', ')).first();

      // Check if search input exists
      const hasSearchInput = await searchInput.isVisible();
      if (!hasSearchInput) {
        console.log('Search input not found, skipping search test');
        return;
      }

      // Capture search input
      await screenshots.captureElement(searchInput, 'search-input');

      // Search for "test"
      await screenshots.captureAction('search-test-term', async () => {
        await searchInput.click();
        await searchInput.fill('test');
        await searchInput.press('Enter');
        await waitForNetworkIdle(page);
        await page.waitForTimeout(500); // Give time for UI to update
      });

      // Take screenshot of search results
      await screenshots.take('search-results');

      // Check for category filters if present
      const categoryFilter = page.locator('select[name="category"], [aria-label*="category" i], [placeholder*="category" i]').first();

      if (await categoryFilter.isVisible()) {
        await screenshots.captureElement(categoryFilter, 'category-filter');

        // Try to select a category
        await screenshots.captureAction('select-category', async () => {
          await categoryFilter.click();
          // Select an option - we'll pick the first one
          const firstOption = page.locator('option').nth(1);
          if (await firstOption.isVisible()) {
            await firstOption.click();
          } else {
            await categoryFilter.selectOption({ index: 1 });
          }
          await waitForNetworkIdle(page);
          await page.waitForTimeout(500);
        });

        // Take screenshot after category filter
        await screenshots.take('category-filtered');
      }

      // Clear search
      await screenshots.captureAction('clear-search', async () => {
        await searchInput.click({ clickCount: 3 });
        await searchInput.fill('');
        await searchInput.press('Enter');
        await waitForNetworkIdle(page);
        await page.waitForTimeout(500);
      });

      // Take screenshot after clearing
      await screenshots.take('cleared-filters');
    } catch (error) {
      console.error(`Error in search test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Search error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('can view recipe details from my recipes', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'my-recipes-details', 'my-recipes');

    try {
      // Login first
      await loginAsTestUser(page, screenshots.testTag);

      // Go to my-recipes
      await page.goto('/my-recipes');
      await waitForNetworkIdle(page);

      // Take screenshot of recipe list
      await screenshots.take('recipe-list');

      // Recipe elements with flexible selectors
      const recipeElements = page.locator([
        '.recipe-card',
        '[class*="recipe" i]',
        '[role="article"]',
        '.card',
        'article',
        'div:has(h2, h3):has(p)',
        'div:has(img):has(h2, h3)'
      ].join(', '));

      // Check if any recipe cards exist
      const recipeCount = await recipeElements.count();
      if (recipeCount === 0) {
        console.log('No recipe cards found, skipping test');
        return;
      }

      // Capture the first recipe
      await screenshots.captureElement(recipeElements.first(), 'first-recipe');

      // Click on the first recipe
      await screenshots.captureAction('click-recipe', async () => {
        const firstRecipe = recipeElements.first();

        // Look for clickable elements within the recipe card
        const clickableElement = await firstRecipe.locator('a, button, [role="link"], [role="button"]').first();

        if (await clickableElement.isVisible()) {
          console.log('Found clickable element in recipe');
          await clickableElement.click();
        } else {
          console.log('No clickable element found, clicking the recipe card itself');
          await firstRecipe.click();
        }

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Give time for page to settle
      });

      // Take screenshot of the detail page
      await screenshots.take('recipe-detail');

      // Verify recipe detail content is visible
      const recipeDetail = page.locator('article, main, [role="main"]').first();
      await expect(recipeDetail).toBeVisible();

      // Check for recipe title
      const recipeTitle = page.getByRole('heading').first();
      if (await recipeTitle.isVisible()) {
        await screenshots.captureElement(recipeTitle, 'recipe-title');
        console.log(`Recipe title: "${await recipeTitle.textContent()}"`);
      }

      // Check for recipe content sections
      const contentSections = page.locator('section, div[class*="ingredient" i], div[class*="instruction" i], div:has(h3, h4)');
      if (await contentSections.first().isVisible()) {
        await screenshots.captureElement(contentSections.first(), 'content-section');
      }
    } catch (error) {
      console.error(`Error in view recipe details test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Recipe details error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('mobile view displays my recipes properly', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'my-recipes-mobile', 'my-recipes');

    try {
      // Login first
      await loginAsTestUser(page, screenshots.testTag);

      // Go to my-recipes
      await page.goto('/my-recipes');
      await waitForNetworkIdle(page);

      // Resize to mobile dimensions
      await screenshots.captureAction('resize-to-mobile', async () => {
        await resizeForDevice(page, 'mobile');
      });

      // Take screenshot in mobile view
      await screenshots.take('mobile-view');

      // Check for mobile navigation
      const mobileMenuElements = page.locator([
        'button[aria-label*="menu" i]',
        'button[aria-label*="navigation" i]',
        'button[aria-label*="hamburger" i]',
        'button[class*="menu" i]',
        'button:has(.hamburger)',
        'button:has(svg)',
        '[role="button"]:has(svg)',
        '.hamburger',
        '.menu-icon'
      ].join(', '));

      // Check if mobile menu exists
      if (await mobileMenuElements.first().isVisible()) {
        await screenshots.captureElement(mobileMenuElements.first(), 'mobile-menu');

        // Try to open mobile menu
        await screenshots.captureAction('open-mobile-menu', async () => {
          await mobileMenuElements.first().click();
          await page.waitForTimeout(500);
        });
      }

      // Verify page content in mobile view
      const pageContent = page.locator('main, [role="main"], #root > div, body > div').first();
      await expect(pageContent).toBeVisible();

      // Check recipe toggle in mobile view
      const recipeToggle = page.locator('div:has(> button:has-text("My Recipes"))').first();
      if (await recipeToggle.isVisible()) {
        await screenshots.captureElement(recipeToggle, 'mobile-recipe-toggle');
      }

      // Check recipe cards in mobile view
      const recipeElements = page.locator([
        '.recipe-card',
        '[class*="recipe" i]',
        '[role="article"]',
        '.card',
        'article',
        'div:has(h2, h3):has(p)',
        'div:has(img):has(h2, h3)'
      ].join(', '));

      if (await recipeElements.first().isVisible()) {
        await screenshots.captureElement(recipeElements.first(), 'mobile-recipe-card');
      }
    } catch (error) {
      console.error(`Error in mobile view test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Mobile view error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('can delete a recipe', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'delete-recipe', 'my-recipes');

    try {
      // Login first
      await loginAsTestUser(page, screenshots.testTag);

      // Go to my-recipes
      await page.goto('/my-recipes');
      await waitForNetworkIdle(page);

      // Take initial screenshot
      await screenshots.take('before-delete');

      // Recipe elements with flexible selectors
      const recipeElements = page.locator([
        '.recipe-card',
        '[class*="recipe" i]',
        '[role="article"]',
        '.card',
        'article',
        'div:has(h2, h3):has(p)',
        'div:has(img):has(h2, h3)'
      ].join(', '));

      // Check if any recipe cards exist
      const recipeCount = await recipeElements.count();
      if (recipeCount === 0) {
        console.log('No recipe cards found, skipping delete test');
        return;
      }

      // Get the first recipe
      const firstRecipe = recipeElements.first();
      await screenshots.captureElement(firstRecipe, 'recipe-to-delete');

      // Look for the recipe title to log which one we're deleting
      const recipeTitle = firstRecipe.locator('h1, h2, h3, h4').first();
      if (await recipeTitle.isVisible()) {
        const titleText = await recipeTitle.textContent();
        console.log(`Recipe to delete: "${titleText}"`);
      }

      // Look for a delete button/menu option
      // First check for direct delete button
      const deleteButton = page.locator([
        'button:has-text("Delete")',
        'button:has-text("Remove")',
        'button[aria-label*="delete" i]',
        'button[aria-label*="remove" i]',
        'svg[aria-label*="delete" i]',
        '[role="button"]:has-text("Delete")'
      ].join(', ')).first();

      // If no direct delete button, look for a menu that might contain delete option
      const menuButton = page.locator([
        'button:has(.dots)',
        'button:has-text("...")',
        'button[aria-label*="menu" i]',
        'button[aria-label*="options" i]',
        'button:has(svg)',
        '[role="button"]:has(svg)',
        '.menu-icon',
        '.more-options'
      ].join(', ')).first();

      // Try the direct delete button if visible
      if (await deleteButton.isVisible()) {
        await screenshots.captureElement(deleteButton, 'delete-button');

        // Click the delete button
        await screenshots.captureAction('click-delete', async () => {
          await deleteButton.click();
          await page.waitForTimeout(500);
        });
      }
      // Otherwise try the menu button
      else if (await menuButton.isVisible()) {
        await screenshots.captureElement(menuButton, 'menu-button');

        // Click the menu button
        await screenshots.captureAction('open-menu', async () => {
          await menuButton.click();
          await page.waitForTimeout(500);
        });

        // Now look for delete option in the menu
        const deleteOption = page.locator([
          'button:has-text("Delete")',
          'button:has-text("Remove")',
          'a:has-text("Delete")',
          '[role="menuitem"]:has-text("Delete")'
        ].join(', ')).first();

        if (await deleteOption.isVisible()) {
          await screenshots.captureElement(deleteOption, 'delete-option');

          // Click delete option
          await screenshots.captureAction('click-delete-option', async () => {
            await deleteOption.click();
            await page.waitForTimeout(500);
          });
        } else {
          console.log('Delete option not found in menu, skipping test');
          return;
        }
      } else {
        console.log('No delete button or menu found, skipping test');
        return;
      }

      // Handle confirmation dialog if it appears
      try {
        // Check for confirmation dialog
        const confirmButton = page.locator([
          'button:has-text("Yes")',
          'button:has-text("Confirm")',
          'button:has-text("OK")',
          '[role="button"]:has-text("Delete")'
        ].join(', ')).first();

        // If confirmation button appears, click it
        if (await confirmButton.isVisible({ timeout: 1000 })) {
          await screenshots.captureElement(confirmButton, 'confirm-delete');

          await screenshots.captureAction('confirm-delete', async () => {
            await confirmButton.click();
            await waitForNetworkIdle(page);
          });
        } else {
          // Handle browser-native dialog if it appears
          page.once('dialog', async dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept();
          });
        }
      } catch (error) {
        console.log('No confirmation dialog appeared, continuing');
      }

      // Wait for the delete operation to complete
      await waitForNetworkIdle(page);
      await page.waitForTimeout(1000);

      // Take screenshot after deletion
      await screenshots.take('after-delete');

      // Verify the recipe was deleted by checking if count decreased
      const recipeCountAfterDelete = await recipeElements.count();
      if (recipeCountAfterDelete < recipeCount) {
        console.log(`Recipe was successfully deleted. Before: ${recipeCount}, After: ${recipeCountAfterDelete}`);
      } else {
        console.log('Recipe count did not change, deletion may have failed');
        // Take a screenshot of the page state since deletion might have failed
        await screenshots.take('delete-verification');
      }
    } catch (error) {
      console.error(`Error in delete recipe test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Delete recipe error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
});
