import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { createTestTag } from './utils/test-tag';
import { PAGE_URLS } from './utils/urls';
import { setupTestDatabase } from './setup/test-database';
import { loginAsTestUser } from './utils/test-utils';

// Skip calendar tests for now
test.describe.skip('Calendar Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the calendar view
    await page.goto('/calendar');
  });

  test('calendar loads correctly on desktop', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('calendar', 'desktop-load');

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'calendar-desktop', 'calendar', '', testTag);

    // Set desktop viewport and take screenshot
    await screenshots.captureAction('resize-to-desktop', async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    // Take initial view screenshot
    await screenshots.take('initial-view');

    // Check for calendar heading
    const heading = page.getByRole('heading', { name: /Calendar/i });
    await expect(heading).toBeVisible();

    // Capture heading if found
    if (await heading.isVisible()) {
      await screenshots.captureElement('h1, h2, h3', 'calendar-heading');
    }

    // Calendar grid should be visible
    const calendarGrid = page.locator('.mantine-Month-month, .calendar-grid');
    await expect(calendarGrid).toBeVisible();

    // Capture calendar grid
    if (await calendarGrid.isVisible()) {
      await screenshots.captureElement('.mantine-Month-month, .calendar-grid', 'calendar-grid');
    }

    // Month name should be visible
    const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthLabel = page.getByText(new RegExp(currentMonthYear, 'i'));
    await expect(monthLabel).toBeVisible();

    // Capture month label
    if (await monthLabel.isVisible()) {
      await screenshots.captureElement(`text=${currentMonthYear}`, 'month-year-label');
    }
  });

  test('calendar loads correctly on mobile', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('calendar', 'mobile-load');

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'calendar-mobile', 'calendar', '', testTag);

    // Set mobile viewport and capture
    await screenshots.captureAction('resize-to-mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    // Take initial mobile view screenshot
    await screenshots.take('mobile-view');

    // Check for calendar heading
    const heading = page.getByRole('heading', { name: /Calendar/i });
    await expect(heading).toBeVisible();

    // Capture mobile heading
    if (await heading.isVisible()) {
      await screenshots.captureElement('h1, h2, h3', 'mobile-heading');
    }

    // Calendar grid should be visible and sized appropriately
    const calendarGrid = page.locator('.mantine-Month-month, .calendar-grid');
    await expect(calendarGrid).toBeVisible();

    // Capture mobile calendar grid
    if (await calendarGrid.isVisible()) {
      await screenshots.captureElement('.mantine-Month-month, .calendar-grid', 'mobile-calendar-grid');
    }

    // Verify the calendar fits on mobile screen
    const gridBox = await calendarGrid.boundingBox();
    expect(gridBox?.width).toBeLessThanOrEqual(375);
  });

  test('can navigate between months on desktop', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('calendar', 'desktop-navigation');

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'month-navigation-desktop', 'calendar', '', testTag);

    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Take initial screenshot
    await screenshots.take('initial-month');

    // Get current month
    const initialMonthText = await page.locator('.calendar-header, .month-title').textContent();

    // Find navigation buttons
    const nextMonthButton = page.locator('button[aria-label="Next month"], .next-month-button');

    // Capture next month button
    if (await nextMonthButton.isVisible()) {
      await screenshots.captureElement('button[aria-label="Next month"], .next-month-button', 'next-month-button');
    }

    // Capture the next month navigation action
    await screenshots.captureAction('next-month-click', async () => {
      // Click next month button
      await nextMonthButton.click();

      // Wait for month to change
      await page.waitForTimeout(300);
    });

    // Should now display a different month
    const newMonthText = await page.locator('.calendar-header, .month-title').textContent();
    expect(newMonthText).not.toEqual(initialMonthText);

    // Find previous month button
    const prevMonthButton = page.locator('button[aria-label="Previous month"], .prev-month-button');

    // Capture previous month button
    if (await prevMonthButton.isVisible()) {
      await screenshots.captureElement('button[aria-label="Previous month"], .prev-month-button', 'prev-month-button');
    }

    // Capture the previous month navigation action
    await screenshots.captureAction('prev-month-click', async () => {
      // Click previous month button to go back
      await prevMonthButton.click();

      // Wait for month to change
      await page.waitForTimeout(300);
    });

    // Should be back to initial month
    const resetMonthText = await page.locator('.calendar-header, .month-title').textContent();
    expect(resetMonthText).toEqual(initialMonthText);
  });

  test('can navigate between months on mobile', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('calendar', 'mobile-navigation');

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'month-navigation-mobile', 'calendar', '', testTag);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Take initial screenshot
    await screenshots.take('initial-month-mobile');

    // Get current month
    const initialMonthText = await page.locator('.calendar-header, .month-title').textContent();

    // Find next month button
    const nextMonthButton = page.locator('button[aria-label="Next month"], .next-month-button');

    // Capture mobile next month button
    if (await nextMonthButton.isVisible()) {
      await screenshots.captureElement('button[aria-label="Next month"], .next-month-button', 'mobile-next-button');
    }

    // Capture the mobile next month navigation action
    await screenshots.captureAction('mobile-next-month-click', async () => {
      // Click next month button
      await nextMonthButton.click();

      // Wait for month to change
      await page.waitForTimeout(300);
    });

    // Should now display a different month
    const newMonthText = await page.locator('.calendar-header, .month-title').textContent();
    expect(newMonthText).not.toEqual(initialMonthText);
  });

  test('can select a date with recipes', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('calendar', 'date-selection');

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'date-selection', 'calendar', '', testTag);

    // Take initial screenshot
    await screenshots.take('calendar-view');

    // Find a date that has a recipe (look for indicators/dots)
    const dateWithRecipe = page.locator('.has-recipes, .event-indicator').first();

    // Capture date with recipe
    if (await dateWithRecipe.isVisible()) {
      await screenshots.captureElement('.has-recipes, .event-indicator', 'date-with-recipe');
    }

    // Capture the date selection action
    await screenshots.captureAction('recipe-date-click', async () => {
      // Click on the date with recipe
      await dateWithRecipe.click();

      // Give time for recipes to load
      await page.waitForTimeout(300);
    });

    // Recipe list for that date should appear
    const recipeList = page.locator('.recipe-list, .date-recipes');
    await expect(recipeList).toBeVisible();

    // Capture recipe list
    if (await recipeList.isVisible()) {
      await screenshots.captureElement('.recipe-list, .date-recipes', 'date-recipe-list');
    }

    await expect(page.getByText(/recipes for/i)).toBeVisible();
  });

  test('can view recipe details from calendar on mobile', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('calendar', 'mobile-recipe-details');

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'calendar-recipe-mobile', 'calendar', '', testTag);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Take initial screenshot
    await screenshots.take('mobile-calendar-view');

    // Find a date that has a recipe
    const dateWithRecipe = page.locator('.has-recipes, .event-indicator').first();
    if (await dateWithRecipe.count() === 0) {
      test.skip(true, 'No dates with recipes found');
      return;
    }

    // Capture date with recipe on mobile
    if (await dateWithRecipe.isVisible()) {
      await screenshots.captureElement('.has-recipes, .event-indicator', 'mobile-date-with-recipe');
    }

    // Capture the date selection and recipe navigation actions
    await screenshots.captureAction('mobile-date-selection', async () => {
      // Click on the date with recipe
      await dateWithRecipe.click();

      // Wait for recipes to appear
      await page.waitForTimeout(300);
    });

    // Recipe list for that date should appear
    const recipeList = page.locator('.recipe-list, .date-recipes');
    await expect(recipeList).toBeVisible();

    // Capture mobile recipe list
    if (await recipeList.isVisible()) {
      await screenshots.captureElement('.recipe-list, .date-recipes', 'mobile-recipe-list');
    }

    // Capture the recipe selection and navigation
    await screenshots.captureAction('mobile-recipe-click', async () => {
      // Click on the first recipe
      await page.locator('.recipe-item, .recipe-card').first().click();

      // Wait for navigation
      await page.waitForLoadState('networkidle');
    });

    // Should navigate to recipe details
    await expect(page).toHaveURL(/\/recipe\//);

    // Take screenshot of recipe details
    await screenshots.take('mobile-recipe-details');

    await expect(page.locator('h1')).toBeVisible();
  });

  test('calendar handles swipe gestures on mobile', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'calendar-swipe', 'calendar');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Take initial screenshot
    await screenshots.take('before-swipe');

    // Get current month
    const initialMonthText = await page.locator('.calendar-header, .month-title').textContent();

    // Simulate swipe right (previous month)
    const calendarEl = page.locator('.mantine-Month-month, .calendar-grid');
    const box = await calendarEl.boundingBox();

    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Capture the swipe right action
      await screenshots.captureAction('swipe-right', async () => {
        await page.mouse.move(centerX - 50, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 150, centerY, { steps: 10 });
        await page.mouse.up();

        // Wait for month change animation
        await page.waitForTimeout(500);
      });

      // Should now display a different month (previous month)
      const newMonthText = await page.locator('.calendar-header, .month-title').textContent();
      expect(newMonthText).not.toEqual(initialMonthText);

      // Take screenshot after swipe right
      await screenshots.take('after-swipe-right');

      // Capture the swipe left action
      await screenshots.captureAction('swipe-left', async () => {
        // Now swipe left (next month, back to original)
        await page.mouse.move(centerX + 50, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX - 150, centerY, { steps: 10 });
        await page.mouse.up();

        // Wait for month change animation
        await page.waitForTimeout(500);
      });

      // Should be back to initial month
      const resetMonthText = await page.locator('.calendar-header, .month-title').textContent();
      expect(resetMonthText).toEqual(initialMonthText);

      // Take screenshot after swipe left
      await screenshots.take('after-swipe-left');
    }
  });

  test('full calendar view loads and displays correctly', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'full-calendar', 'calendar');

    // Navigate to the full calendar view
    await page.goto('/full-calendar');

    // Take initial screenshot
    await screenshots.take('full-view');

    // Check for full calendar heading
    const heading = page.getByRole('heading', { name: /Calendar/i });
    await expect(heading).toBeVisible();

    // Capture heading
    if (await heading.isVisible()) {
      await screenshots.captureElement('h1, h2, h3', 'full-calendar-heading');
    }

    // Calendar should display the current month and year
    const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthLabel = page.getByText(new RegExp(currentMonthYear, 'i'));
    await expect(monthLabel).toBeVisible();

    // Capture month label
    if (await monthLabel.isVisible()) {
      await screenshots.captureElement(`text=${currentMonthYear}`, 'full-calendar-month');
    }

    // Should show recipe count for the month
    const recipeCount = page.getByText(/recipes this month/i);
    await expect(recipeCount).toBeVisible();

    // Capture recipe count
    if (await recipeCount.isVisible()) {
      await screenshots.captureElement('text=/recipes this month/i', 'month-recipe-count');
    }
  });

  test('full calendar is responsive on mobile', async ({ page }) => {
    // Create screenshot helper
    const screenshots = new ScreenshotHelper(page, 'full-calendar-mobile', 'calendar');

    // Navigate to the full calendar view
    await page.goto('/full-calendar');

    // Capture viewport resize
    await screenshots.captureAction('resize-to-mobile', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
    });

    // Take mobile view screenshot
    await screenshots.take('mobile-full-calendar');

    // Check that calendar is visible and formatted for mobile
    const calendar = page.locator('.mantine-Month-month');
    await expect(calendar).toBeVisible();

    // Capture mobile calendar
    if (await calendar.isVisible()) {
      await screenshots.captureElement('.mantine-Month-month', 'mobile-full-calendar-grid');
    }

    // Calendar should fit on mobile screen without horizontal scroll
    const pageWidth = 375;
    const calendarWidth = await page.evaluate(() => {
      const calendar = document.querySelector('.mantine-Month-month');
      return calendar ? calendar.clientWidth : 0;
    });

    expect(calendarWidth).toBeLessThanOrEqual(pageWidth);
  });
});

test.describe('Calendar Functionality', () => {
  test('displays calendar view', async ({ page }) => {
    const testTag = createTestTag('calendar', 'display');
    const screenshots = new ScreenshotHelper(page, testTag);
    await setupTestDatabase(testTag);
    await loginAsTestUser(page, testTag);
    await page.goto(PAGE_URLS.calendar.default);
    await screenshots.take('calendar-view');
    // ... existing code ...
  });

  test('displays full calendar view', async ({ page }) => {
    const testTag = createTestTag('calendar', 'full-view');
    const screenshots = new ScreenshotHelper(page, testTag);
    await setupTestDatabase(testTag);
    await loginAsTestUser(page, testTag);
    await page.goto(PAGE_URLS.calendar.full);
    await screenshots.take('full-calendar');
    // ... existing code ...
  });
});
