import { test, expect } from '@playwright/test';

test.describe('Calendar Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the calendar view
    await page.goto('/calendar');
  });

  test('calendar loads correctly on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Check for calendar heading
    await expect(page.getByRole('heading', { name: /Calendar/i })).toBeVisible();

    // Calendar grid should be visible
    await expect(page.locator('.mantine-Month-month, .calendar-grid')).toBeVisible();

    // Month name should be visible
    const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    await expect(page.getByText(new RegExp(currentMonthYear, 'i'))).toBeVisible();
  });

  test('calendar loads correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check for calendar heading
    await expect(page.getByRole('heading', { name: /Calendar/i })).toBeVisible();

    // Calendar grid should be visible and sized appropriately
    const calendarGrid = page.locator('.mantine-Month-month, .calendar-grid');
    await expect(calendarGrid).toBeVisible();

    // Verify the calendar fits on mobile screen
    const gridBox = await calendarGrid.boundingBox();
    expect(gridBox?.width).toBeLessThanOrEqual(375);
  });

  test('can navigate between months on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Get current month
    const initialMonthText = await page.locator('.calendar-header, .month-title').textContent();

    // Click next month button
    await page.locator('button[aria-label="Next month"], .next-month-button').click();

    // Wait for month to change
    await page.waitForTimeout(300);

    // Should now display a different month
    const newMonthText = await page.locator('.calendar-header, .month-title').textContent();
    expect(newMonthText).not.toEqual(initialMonthText);

    // Click previous month button to go back
    await page.locator('button[aria-label="Previous month"], .prev-month-button').click();

    // Wait for month to change
    await page.waitForTimeout(300);

    // Should be back to initial month
    const resetMonthText = await page.locator('.calendar-header, .month-title').textContent();
    expect(resetMonthText).toEqual(initialMonthText);
  });

  test('can navigate between months on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Get current month
    const initialMonthText = await page.locator('.calendar-header, .month-title').textContent();

    // Click next month button
    await page.locator('button[aria-label="Next month"], .next-month-button').click();

    // Wait for month to change
    await page.waitForTimeout(300);

    // Should now display a different month
    const newMonthText = await page.locator('.calendar-header, .month-title').textContent();
    expect(newMonthText).not.toEqual(initialMonthText);
  });

  test('can select a date with recipes', async ({ page }) => {
    // Find a date that has a recipe (look for indicators/dots)
    const dateWithRecipe = page.locator('.has-recipes, .event-indicator').first();

    // Click on the date with recipe
    await dateWithRecipe.click();

    // Recipe list for that date should appear
    await expect(page.locator('.recipe-list, .date-recipes')).toBeVisible();
    await expect(page.getByText(/recipes for/i)).toBeVisible();
  });

  test('can view recipe details from calendar on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Find a date that has a recipe
    const dateWithRecipe = page.locator('.has-recipes, .event-indicator').first();
    if (await dateWithRecipe.count() === 0) {
      test.skip(true, 'No dates with recipes found');
      return;
    }

    // Click on the date with recipe
    await dateWithRecipe.click();

    // Recipe list for that date should appear
    await expect(page.locator('.recipe-list, .date-recipes')).toBeVisible();

    // Click on the first recipe
    await page.locator('.recipe-item, .recipe-card').first().click();

    // Should navigate to recipe details
    await expect(page).toHaveURL(/\/recipe\//);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('calendar handles swipe gestures on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Get current month
    const initialMonthText = await page.locator('.calendar-header, .month-title').textContent();

    // Simulate swipe right (previous month)
    const calendarEl = page.locator('.mantine-Month-month, .calendar-grid');
    const box = await calendarEl.boundingBox();

    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      await page.mouse.move(centerX - 50, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 150, centerY, { steps: 10 });
      await page.mouse.up();

      // Wait for month change animation
      await page.waitForTimeout(500);

      // Should now display a different month (previous month)
      const newMonthText = await page.locator('.calendar-header, .month-title').textContent();
      expect(newMonthText).not.toEqual(initialMonthText);

      // Now swipe left (next month, back to original)
      await page.mouse.move(centerX + 50, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX - 150, centerY, { steps: 10 });
      await page.mouse.up();

      // Wait for month change animation
      await page.waitForTimeout(500);

      // Should be back to initial month
      const resetMonthText = await page.locator('.calendar-header, .month-title').textContent();
      expect(resetMonthText).toEqual(initialMonthText);
    }
  });

  test('full calendar view loads and displays correctly', async ({ page }) => {
    // Navigate to the full calendar view
    await page.goto('/full-calendar');

    // Check for full calendar heading
    await expect(page.getByRole('heading', { name: /Calendar/i })).toBeVisible();

    // Calendar should display the current month and year
    const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    await expect(page.getByText(new RegExp(currentMonthYear, 'i'))).toBeVisible();

    // Should show recipe count for the month
    await expect(page.getByText(/recipes this month/i)).toBeVisible();
  });

  test('full calendar is responsive on mobile', async ({ page }) => {
    // Navigate to the full calendar view
    await page.goto('/full-calendar');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that calendar is visible and formatted for mobile
    await expect(page.locator('.mantine-Month-month')).toBeVisible();

    // Calendar should fit on mobile screen without horizontal scroll
    const pageWidth = 375;
    const calendarWidth = await page.evaluate(() => {
      const calendar = document.querySelector('.mantine-Month-month');
      return calendar ? calendar.clientWidth : 0;
    });

    expect(calendarWidth).toBeLessThanOrEqual(pageWidth);
  });
});
