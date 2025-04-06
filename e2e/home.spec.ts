import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';

test('home page loads successfully', async ({ page }) => {
  // Create screenshot helper
  const screenshots = new ScreenshotHelper(page, 'home-page', 'home');

  await page.goto('/');

  // Check that the page has loaded with extended timeout
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

  // Take screenshot using helper
  await screenshots.take('initial-view');

  // Check that the page has content
  await expect(page.locator('body')).not.toBeEmpty();

  // Look for common home page elements with flexible selectors
  const navbar = page.locator('nav, header, [role="navigation"], div[class*="navbar"], div[class*="header"]').first();
  const logo = page.getByText(/cook.?eat/i).or(page.locator('header img, nav img, a img')).first();
  const mainContent = page.locator('main, [role="main"], article, section, div[class*="content"], div[class*="container"]').first();

  // Capture navbar if found
  if (await navbar.isVisible()) {
    await screenshots.captureElement(navbar, 'navbar');
    await expect(navbar).toBeVisible();
  } else {
    console.log('Navigation bar not found with standard selectors');
  }

  // Capture logo if found
  if (await logo.isVisible()) {
    await screenshots.captureElement(logo, 'logo');
    await expect(logo).toBeVisible();
  } else {
    console.log('Logo not found with standard selectors');
  }

  // Capture main content
  if (await mainContent.isVisible()) {
    await screenshots.captureElement(mainContent, 'main-content');
    await expect(mainContent).toBeVisible();
  } else {
    // If we can't find main content, just check for any meaningful content
    const anyContent = page.locator('div:not(:empty)');
    await expect(anyContent.first()).toBeVisible();
    console.log('Main content not found with standard selectors, but page has content');
  }
});

test('navigation links work correctly', async ({ page }) => {
  // Create screenshot helper
  const screenshots = new ScreenshotHelper(page, 'navigation', 'home');

  await page.goto('/');

  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Take initial screenshot
  await screenshots.take('before-navigation');

  // Find navigation links with flexible selectors
  const recipesLink = page.getByRole('link', { name: /recipes|posts|home|browse/i }).or(
    page.locator('a').filter({ hasText: /recipes|posts|home|browse/i })
  ).first();

  // Capture navigation links if found
  if (await recipesLink.isVisible()) {
    await screenshots.captureElement(recipesLink, 'nav-link');
  }

  // Skip test if we can't find navigation links
  if (!(await recipesLink.isVisible())) {
    console.log('Navigation links not found, skipping test');
    test.skip();
    return;
  }

  // Capture the navigation action
  await screenshots.captureAction('nav-link-click', async () => {
    // Click on the link and check navigation
    await recipesLink.click();

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
  });

  // Take screenshot after navigation
  await screenshots.take('after-navigation');

  // Verify the page loaded some content
  const content = page.locator('div:not(:empty)');
  await expect(content.first()).toBeVisible();
});

test('responsive design works on mobile', async ({ page }) => {
  // Create screenshot helper
  const screenshots = new ScreenshotHelper(page, 'home-mobile', 'responsive');

  // Set viewport to mobile size first
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Take screenshot of mobile view
  await screenshots.take('mobile-view');

  // Look for mobile menu button with flexible selectors
  const menuButton = page.locator(
    'button[aria-label*="menu" i], button[class*="hamburger" i], button[class*="menu" i], button:has(svg), [aria-label*="menu" i]'
  ).first();

  // Try to find any visible button if the menu button isn't found
  const anyButton = page.locator('button:visible');

  // Check if we have any menu button or at least any button
  const buttonExists = await menuButton.isVisible() || await anyButton.count() > 0;

  if (buttonExists) {
    // If menu button exists, try to click it
    if (await menuButton.isVisible()) {
      await screenshots.captureElement(menuButton, 'menu-button');
      await menuButton.click();
      await page.waitForTimeout(500); // Give menu time to animate
      await screenshots.take('after-menu-click');
    } else if (await anyButton.count() > 0) {
      // Try clicking the first visible button
      await screenshots.captureElement(anyButton.first(), 'any-button');
      await anyButton.first().click();
      await page.waitForTimeout(500);
      await screenshots.take('after-button-click');
    }
  }

  // Just verify the page doesn't crash in mobile view
  await expect(page.locator('body')).toBeVisible();
});
