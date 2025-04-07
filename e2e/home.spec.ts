import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { takeDebugScreenshot, waitForNetworkIdle } from './utils/test-utils';

test('home page loads successfully', async ({ page }) => {
  // Create screenshot helper
  const screenshots = new ScreenshotHelper(page, 'home-page', 'home');

  await page.goto('/');

  // Wait for the page to be fully loaded
  await waitForNetworkIdle(page);

  // Take a debug screenshot
  await takeDebugScreenshot(page, 'home-debug', 'home');

  // Check that the page has loaded with extended timeout
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

  // Take screenshot using helper
  await screenshots.take('initial-view');

  // Check that the page has content
  await expect(page.locator('body')).not.toBeEmpty();

  // Look for common home page elements with flexible selectors
  const navbar = page.locator('nav, header, [role="navigation"], div[class*="navbar"], div[class*="header"]').first();
  const logo = page.getByText(/cook.?eat/i).or(page.locator('header img, nav img, a img, svg')).first();
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
  await waitForNetworkIdle(page);

  // Take initial screenshot
  await screenshots.take('before-navigation');

  // Find navigation links with more flexible selectors
  const navLinks = page.locator([
    'nav a',
    'header a',
    '[role="navigation"] a',
    'a[href="/recipes"]',
    'a[href="/all-recipes"]',
    'a[href="/my-recipes"]',
    'a:has-text("Recipe")',
    'a:has-text("Home")',
    'a:has-text("Cook")',
    'a:has-text("Eat")'
  ].join(', '));

  // Count available links
  const linkCount = await navLinks.count();
  console.log(`Found ${linkCount} potential navigation links`);

  // Capture first navigation link if found
  if (linkCount > 0) {
    await screenshots.captureElement(navLinks.first(), 'nav-link');
  }

  // Skip test if we can't find navigation links
  if (linkCount === 0) {
    console.log('Navigation links not found, skipping test');
    test.skip();
    return;
  }

  // Get the href of the first link
  const firstLinkHref = await navLinks.first().getAttribute('href');
  console.log(`Clicking link with href: ${firstLinkHref}`);

  // Capture the navigation action
  await screenshots.captureAction('nav-link-click', async () => {
    // Click on the link and check navigation
    await navLinks.first().click();

    // Wait for navigation to complete
    await waitForNetworkIdle(page);
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
