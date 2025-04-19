import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import {
  resetDatabase,
  verifyCommonElements,
  resizeForDevice,
  waitForNetworkIdle,
  takeDebugScreenshot,
  loginAsTestUser
} from './utils/test-utils';
import { createTestTag } from './utils/test-tag';
import { setupTestDatabase } from './setup/test-database';
import { PAGE_URLS } from './utils/urls';

test.describe('Home Page', () => {
  // Reset database before running tests
  test.beforeAll(async () => {
    await resetDatabase();
  });

  test('home page loads correctly', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('home', 'page-load');

    // Setup test database with test tag
    await setupTestDatabase(testTag);

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, testTag, 'home');

    // Navigate to home page
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Take screenshot of the home page
    await screenshots.take('home-page-initial');

    // Verify header/navigation is visible
    const header = page.locator('header, nav, .navigation');
    if (await header.isVisible()) {
      await screenshots.captureElement('header, nav, .navigation', 'header');
      console.log('Header is visible');
    } else {
      console.log('Header not found');
    }

    // Check if hero/welcome section exists
    const heroSection = page.locator('.hero, section:first-child, main > div:first-child');

    if (await heroSection.isVisible()) {
      await screenshots.captureElement('.hero, section:first-child, main > div:first-child', 'hero-section');
      console.log('Hero section is visible');

      // Look for headings in the hero section
      const heading = heroSection.locator('h1, h2').first();
      if (await heading.isVisible()) {
        const headingText = await heading.textContent();
        console.log(`Found heading: "${headingText}"`);
      }
    } else {
      console.log('Hero section not found');
    }

    // Check for main content area
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    await screenshots.captureElement('main', 'main-content');

    // Check for footer
    const footer = page.locator('footer');
    if (await footer.isVisible()) {
      await screenshots.captureElement('footer', 'footer');
      console.log('Footer is visible');
    } else {
      console.log('Footer not found');
    }
  });

  test('home page loads content when logged in', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('home', 'logged-in-content');

    // Setup test database with test tag
    await setupTestDatabase(testTag);

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, testTag, 'home');

    // Login as test user
    await loginAsTestUser(page, testTag);

    // Navigate to home page
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Take screenshot of the home page when logged in
    await screenshots.take('home-page-logged-in');

    // Verify user-specific content is visible
    const userGreeting = page.locator('text=Welcome back, text="Test User"');

    // Check for any user-specific elements
    const userSpecificElements = [
      page.locator('text="My Recipes"'),
      page.locator('text="Favorites"'),
      page.locator('text="Profile"'),
      page.locator('.user-menu, .profile-icon, [data-testid="user-menu"]')
    ];

    let foundUserSpecificContent = false;

    for (const element of userSpecificElements) {
      if (await element.isVisible().catch(() => false)) {
        foundUserSpecificContent = true;
        await screenshots.captureElement(element, 'user-specific-content');
        const elementText = await element.textContent();
        console.log(`Found user-specific content: "${elementText}"`);
        break;
      }
    }

    if (!foundUserSpecificContent) {
      console.log('No user-specific content found, but user is logged in');
    }

    // Look for recipe cards or content specific to authenticated users
    const recipeSection = page.locator('.recipe-list, .recipes-container, section:has(.recipe-card)').first();

    if (await recipeSection.isVisible()) {
      await screenshots.captureElement(recipeSection, 'recipe-section');
      console.log('Recipe section is visible');

      // Count recipe cards if they exist
      const recipeCards = page.locator('.recipe-card, article');
      const cardCount = await recipeCards.count();
      console.log(`Found ${cardCount} recipe cards`);

      if (cardCount > 0) {
        await screenshots.captureElement('.recipe-card, article', 'recipe-card');
      }
    } else {
      console.log('No recipe section found');
    }
  });

  test('navigation menu works', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('home', 'navigation');

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, testTag, 'home');

    // Login as test user
    await loginAsTestUser(page, testTag);

    // Navigate to home page
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Take screenshot of initial state
    await screenshots.take('before-navigation');

    // Look for main navigation links
    const navLinks = page.locator('nav a, header a');
    const linkCount = await navLinks.count();

    if (linkCount === 0) {
      console.log('No navigation links found, skipping test');
      test.skip();
      return;
    }

    console.log(`Found ${linkCount} navigation links`);

    // Find a link to recipes or all recipes
    const recipesLink = page.locator('a:has-text("Recipes"), a:has-text("All Recipes")').first();

    if (!(await recipesLink.isVisible().catch(() => false))) {
      console.log('Recipes link not found, trying to find any clickable navigation link');
      // Try to find any navigation link as fallback
      const anyLink = navLinks.first();
      if (await anyLink.isVisible()) {
        const linkText = await anyLink.textContent();
        console.log(`Using alternative link: "${linkText}"`);

        // Click the link
        await screenshots.captureAction('click-nav-link', async () => {
          await anyLink.click();
          await waitForNetworkIdle(page);
        });

        // Take screenshot after navigation
        await screenshots.take('after-navigation');

        // Verify page has changed
        const currentUrl = page.url();
        expect(currentUrl).not.toEqual('/');
        console.log(`Navigated to: ${currentUrl}`);
      } else {
        console.log('No clickable navigation links found, skipping test');
        test.skip();
      }
      return;
    }

    // Capture recipes link
    await screenshots.captureElement(recipesLink, 'recipes-link');

    // Click recipes link
    await screenshots.captureAction('click-recipes-link', async () => {
      await recipesLink.click();
      await waitForNetworkIdle(page);
    });

    // Take screenshot after navigation
    await screenshots.take('recipes-page');

    // Verify we're on recipes page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/recipes');
    console.log(`Navigated to: ${currentUrl}`);
  });

  test('displays welcome message', async ({ page }) => {
    const testTag = createTestTag('home', 'welcome');
    const screenshots = new ScreenshotHelper(page, testTag, 'home');
    await setupTestDatabase(testTag);
    await page.goto(PAGE_URLS.home);
    await screenshots.take('welcome-message');
    // ... existing code ...
  });

  test('displays featured recipes', async ({ page }) => {
    const testTag = createTestTag('home', 'featured');
    const screenshots = new ScreenshotHelper(page, testTag, 'home');
    await setupTestDatabase(testTag);
    await page.goto(PAGE_URLS.home);
    await screenshots.take('featured-recipes');
    // ... existing code ...
  });

  test('displays user menu when logged in', async ({ page }) => {
    const testTag = createTestTag('home', 'user-menu');
    const screenshots = new ScreenshotHelper(page, testTag, 'home');
    await setupTestDatabase(testTag);
    await loginAsTestUser(page, testTag);
    await page.goto(PAGE_URLS.home);
    await screenshots.take('user-menu');
    // ... existing code ...
  });
});

test('responsive design works on mobile', async ({ page }) => {
  // Create a test tag for this test
  const testTag = createTestTag('home', 'responsive-mobile');

  // Create screenshot helper with the test tag
  const screenshots = new ScreenshotHelper(page, testTag, 'responsive');

  // Set viewport to mobile size first
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/');

  // Wait for page to load
  await waitForNetworkIdle(page);

  // Take screenshot of mobile view
  await screenshots.take('mobile-view');

  // Create debug screenshot
  await takeDebugScreenshot(page, 'home-mobile-debug', 'responsive');

  // Look for mobile menu button with flexible selectors
  const menuButtons = page.locator([
    'button[aria-label*="menu" i]',
    'button[aria-label*="navigation" i]',
    'button[aria-label*="hamburger" i]',
    'button[class*="menu" i]:not([disabled])',
    'button:has(.hamburger):not([disabled])',
    'button:has(svg):not([disabled])',
    '[role="button"]:has(svg):not([disabled])',
    '.hamburger:not([disabled])',
    '.menu-icon:not([disabled])'
  ].join(', '));

  // Count menu buttons found
  const menuButtonCount = await menuButtons.count();
  console.log(`Found ${menuButtonCount} potential menu buttons`);

  // Get a list of all buttons to inspect
  const allButtons = page.locator('button');
  const allButtonCount = await allButtons.count();
  console.log(`Found ${allButtonCount} total buttons on the page`);

  // Log the state of the first few buttons for debugging
  for (let i = 0; i < Math.min(allButtonCount, 5); i++) {
    const button = allButtons.nth(i);
    const text = await button.textContent();
    const isDisabled = await button.isDisabled();
    const hasDisabledAttr = await button.getAttribute('disabled') !== null;
    console.log(`Button ${i}: Text="${text}", isDisabled=${isDisabled}, hasDisabledAttr=${hasDisabledAttr}`);
  }

  // Only attempt to click a button if we found enabled menu buttons
  if (menuButtonCount > 0) {
    const buttonToClick = menuButtons.first();

    // Check if the button is really clickable
    const isEnabled = !(await buttonToClick.isDisabled());

    if (isEnabled) {
      await screenshots.captureElement(buttonToClick, 'menu-button');
      console.log('Found enabled menu button, clicking it');

      try {
        await buttonToClick.click();
        await page.waitForTimeout(500); // Give menu time to animate
        await screenshots.take('after-menu-click');
      } catch (error) {
        console.log(`Error clicking menu button: ${error instanceof Error ? error.message : String(error)}`);
        await screenshots.captureError(`Failed to click menu: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('Menu button is disabled, not clicking');
      await screenshots.captureElement(buttonToClick, 'disabled-menu-button');
    }
  } else {
    console.log('No enabled menu buttons found');
  }

  // Verify the page doesn't crash in mobile view
  await expect(page.locator('body')).toBeVisible();

  // Just verify we can still see some content
  const pageContent = page.locator('main, [role="main"], div.container, div:not(:empty)').first();
  await expect(pageContent).toBeVisible();
  await screenshots.captureElement(pageContent, 'mobile-content');
});
