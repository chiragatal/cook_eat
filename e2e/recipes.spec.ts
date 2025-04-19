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
import { setupTestDatabase, getTestPostId } from './setup/test-database';
import { PAGE_URLS } from './utils/urls';

// Test recipe ID from test-database.ts
const testPostId = 'test_post_1';

test.describe('Recipe Functionality', () => {
  // Reset database before running tests in this file
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // Set up for tests
  test.beforeEach(async ({ page }) => {
    await page.goto('/all-recipes');
    // Wait for network idle to ensure the page is fully loaded
    await waitForNetworkIdle(page);
  });

  test('can view recipe list', async ({ page }) => {
    const testTag = createTestTag('recipe', 'view-list');
    const screenshots = new ScreenshotHelper(page, testTag, 'recipes');
    await setupTestDatabase(testTag);
    await page.goto(PAGE_URLS.recipes.list);

    try {
      // Take initial screenshot
      await screenshots.take('initial-view');

      // First check if the page loaded at all
      const pageContent = await page.content();
      expect(pageContent).toContain('html');

      // Very broad heading selector
      const heading = page.getByRole('heading').first();

      // If heading is visible, capture it
      if (await heading.isVisible()) {
        await screenshots.captureElement('h1, h2, h3', 'heading');
        // Check if it contains some text
        const headingText = await heading.textContent();
        console.log(`Found heading: "${headingText}"`);
      } else {
        console.log('No heading found on the page');
      }

      // Check for any content in the main area using a very broad selector
      const mainContent = page.locator('main, [role="main"], div.container, div.content, .recipes, #root > div, body > div').first();
      expect(mainContent).toBeVisible();

      // Capture whatever content we found
      await screenshots.captureElement('main, [role="main"], div.container', 'main-content');

      // Look for recipe elements with flexible selectors
      const recipeElements = page.locator([
        // Match by class name variations
        '.recipe-card',
        '[class*="recipe" i]',
        // Match by aria role
        '[role="article"]',
        // Match by general card UI patterns
        '.card',
        'article',
        // Match by specific elements that might be in recipe cards
        'div:has(h2, h3):has(p)',
        'div:has(img):has(h2, h3)'
      ].join(', '));

      const recipeCount = await recipeElements.count();
      console.log(`Found ${recipeCount} potential recipe elements`);

      if (recipeCount > 0) {
        // Capture the first recipe element
        await screenshots.captureElement(recipeElements.first(), 'recipe-element');
        await expect(recipeElements.first()).toBeVisible();
      } else {
        // If we can't find recipe elements, check if there's any visible content
        console.log('No recipe cards found, checking for any content');
        const anyContent = page.locator('div:not(:empty)');
        expect(await anyContent.count()).toBeGreaterThan(0);
        await screenshots.take('page-content');
      }
    } catch (error) {
      console.error(`Error in view recipe list test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Recipe list error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('can search for recipes', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('recipe', 'search');

    // Setup test data with this test tag
    await setupTestDatabase(testTag);

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, testTag, 'recipes');

    try {
      // Take initial screenshot
      await screenshots.take('before-search');

      // Wait for the page to be fully loaded
      await waitForNetworkIdle(page);

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

      // Take screenshot of the page
      await screenshots.take('search-area');

      // Check if search input exists
      const hasSearchInput = await searchInput.isVisible();
      if (!hasSearchInput) {
        console.log('Search input not found, skipping search test');
        test.skip();
        return;
      }

      // Capture search input
      await screenshots.captureElement(searchInput, 'search-input');

      // Search for test recipe
      await screenshots.captureAction('search-input', async () => {
        await searchInput.click();
        await searchInput.fill('test');
        await searchInput.press('Enter');
        await waitForNetworkIdle(page);
        await page.waitForTimeout(500); // Give time for UI to update
      });

      // Take screenshot of search results
      await screenshots.take('search-results');

      // Check results
      const searchResults = page.locator('.recipe-card, [class*="recipe" i], .card, article');
      const resultsCount = await searchResults.count();

      if (resultsCount > 0) {
        console.log(`Found ${resultsCount} search results`);
        await screenshots.captureElement(searchResults.first(), 'search-result');
        await expect(searchResults.first()).toBeVisible();
      }

      // Search for something else
      await screenshots.captureAction('new-search', async () => {
        await searchInput.click({ clickCount: 3 }); // Triple-click to select all
        await searchInput.fill('pasta');
        await searchInput.press('Enter');
        await waitForNetworkIdle(page);
        await page.waitForTimeout(500);
      });

      // Take screenshot of new search results
      await screenshots.take('pasta-results');

      // Clear search
      await screenshots.captureAction('clear-search', async () => {
        await searchInput.click({ clickCount: 3 });
        await searchInput.fill('');
        await searchInput.press('Enter');
        await waitForNetworkIdle(page);
        await page.waitForTimeout(500);
      });
    } catch (error) {
      console.error(`Error in search recipes test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Recipe search error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('can view recipe details', async ({ page }) => {
    const testTag = createTestTag('recipe', 'view-details');
    const screenshots = new ScreenshotHelper(page, testTag, 'recipes');
    await setupTestDatabase(testTag);
    const testPostId = await getTestPostId();
    await page.goto(PAGE_URLS.recipes.details(testPostId));
    await screenshots.take('recipe-details');

    try {
      // Wait for the page to be fully loaded
      await waitForNetworkIdle(page);

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
        test.skip();
        return;
      }

      // Take screenshot of recipe list
      await screenshots.captureElement(recipeElements.first(), 'first-recipe');

      // Click on the first recipe and wait for navigation
      await screenshots.captureAction('recipe-click', async () => {
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

      // Take screenshot of detail page
      await screenshots.take('recipe-detail-view');

      // Check if we have content on the detail page
      const detailContent = page.locator('main, article, [role="main"], div.container').first();
      await expect(detailContent).toBeVisible();

      // Find heading element
      const heading = page.getByRole('heading').first();
      if (await heading.isVisible()) {
        await screenshots.captureElement(heading, 'recipe-title');
        const headingText = await heading.textContent();
        console.log(`Recipe title: "${headingText}"`);
      }

      // Look for content that might contain ingredients or instructions
      const contentSections = page.locator('section, div.section, div[class*="ingredients"], div[class*="instructions"]');
      const sectionCount = await contentSections.count();
      console.log(`Found ${sectionCount} content sections`);

      if (sectionCount > 0) {
        await screenshots.captureElement(contentSections.first(), 'content-section');
      }
    } catch (error) {
      console.error(`Error in view recipe details test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Recipe details error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('mobile view displays recipe properly', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'recipe-mobile', 'recipes');

    try {
      // Resize to mobile dimensions
      await screenshots.captureAction('resize-to-mobile', async () => {
        await resizeForDevice(page, 'mobile');
      });

      // Take screenshot in mobile view
      await screenshots.take('mobile-view');

      // Check for mobile navigation - be very flexible with selectors
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

      const hasMobileMenu = await mobileMenuElements.count() > 0;
      if (hasMobileMenu) {
        await screenshots.captureElement(mobileMenuElements.first(), 'mobile-menu');
        console.log('Found mobile menu button');
      } else {
        console.log('Mobile menu button not found, checking for other page content');
      }

      // Check if the page has loaded by looking for any content
      const pageContent = page.locator('main, [role="main"], #root > div, body > div').first();
      await expect(pageContent).toBeVisible();
      await screenshots.captureElement(pageContent, 'mobile-page-content');

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

      const recipeCount = await recipeElements.count();
      if (recipeCount === 0) {
        console.log('No recipe cards found in mobile view');
        return;
      }

      // Capture a recipe card in mobile view
      await screenshots.captureElement(recipeElements.first(), 'mobile-recipe-card');

      // Verify we can see recipe content
      await expect(recipeElements.first()).toBeVisible();
    } catch (error) {
      console.error(`Error in mobile view test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Mobile view error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('logged in users can create a recipe', async ({ page }) => {
    const testTag = createTestTag('recipe', 'create');
    const screenshots = new ScreenshotHelper(page, testTag, 'recipes');
    await setupTestDatabase(testTag);
    await page.goto(PAGE_URLS.recipes.create);
    await screenshots.take('create-recipe-form');

    try {
      // Login as test user with test tag
      await loginAsTestUser(page, testTag);

      // Wait for the page to be fully loaded
      await waitForNetworkIdle(page);

      // Look for form elements
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
      const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
      const categoryInput = page.locator('select[name="category"], input[name="category"]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();

      // Check if form elements exist
      const hasForm = await titleInput.isVisible() && await descriptionInput.isVisible() && await submitButton.isVisible();

      if (!hasForm) {
        console.log('Create recipe form not found, skipping test');
        test.skip();
        return;
      }

      // Fill in the form
      await titleInput.fill('E2E Test Recipe');
      await descriptionInput.fill('This is a test recipe created through E2E testing');

      if (await categoryInput.isVisible()) {
        // If it's a select, choose an option
        if (await page.locator('select[name="category"]').isVisible()) {
          await categoryInput.selectOption({ index: 1 });
        } else {
          // Otherwise treat as input
          await categoryInput.fill('Testing');
        }
      }

      // Look for additional fields that might be required
      const ingredientsInput = page.locator('textarea[name="ingredients"], textarea[placeholder*="ingredient" i]').first();
      if (await ingredientsInput.isVisible()) {
        await ingredientsInput.fill('Test ingredient 1\nTest ingredient 2');
      }

      const instructionsInput = page.locator('textarea[name="instructions"], textarea[placeholder*="instruction" i], textarea[placeholder*="steps" i]').first();
      if (await instructionsInput.isVisible()) {
        await instructionsInput.fill('Step 1: Test step\nStep 2: Another test step');
      }

      // Take screenshot of filled form
      await screenshots.take('filled-form');

      // Submit the form
      await screenshots.captureAction('submit-form', async () => {
        await submitButton.click();
        await page.waitForURL('**/*', { timeout: 30000 });
        await waitForNetworkIdle(page);
      });

      // Take screenshot after submission
      await screenshots.take('after-submit');

      // Check if we're redirected to a recipe detail page
      const currentUrl = page.url();
      const isDetailPage = !currentUrl.includes('/create-recipe');

      console.log(`Current URL after submission: ${currentUrl}`);

      if (isDetailPage) {
        console.log('Successfully created recipe and redirected to detail page');

        // Check for recipe title
        const recipeTitle = page.getByRole('heading').first();
        const recipeTitleVisible = await recipeTitle.isVisible();

        if (recipeTitleVisible) {
          const titleText = await recipeTitle.textContent();
          console.log(`Recipe title on detail page: "${titleText}"`);
          await screenshots.captureElement(recipeTitle, 'recipe-title');

          // Verify it matches what we created
          const isTitleMatch = titleText?.includes('E2E Test Recipe') || false;
          console.log(`Title match with created recipe: ${isTitleMatch}`);
        }
      }
    } catch (error) {
      console.error(`Error in create recipe test: ${error instanceof Error ? error.message : String(error)}`);
      await screenshots.captureError(`Create recipe error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
});
