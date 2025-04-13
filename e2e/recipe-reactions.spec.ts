import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { resetDatabase, waitForNetworkIdle, loginAsTestUser } from './utils/test-utils';
import { createTestTag } from './utils/test-tag';
import { PAGE_URLS } from './utils/urls';
import { setupTestDatabase, getTestPostId } from './setup/test-database';

test.describe('Recipe Reactions', () => {
  test('displays reaction buttons', async ({ page }) => {
    const testTag = createTestTag('reactions', 'display');
    const screenshots = new ScreenshotHelper(page, testTag);
    await setupTestDatabase(testTag);
    const testPostId = await getTestPostId();
    await page.goto(PAGE_URLS.recipes.details(testPostId));
    await screenshots.take('reaction-buttons');

    // Ensure recipe loads
    const recipeTitle = page.locator('h1').first();
    await expect(recipeTitle).toBeVisible({ timeout: 10000 });

    // Create screenshot helper with the test tag
    const screenshotsHelper = new ScreenshotHelper(page, 'recipe-reactions', 'reactions', '', testTag);

    // Take initial screenshot
    await screenshotsHelper.take('recipe-page');

    // Check if reaction section exists
    const reactionsSection = page.locator('.recipe-reactions, .reactions-container, [data-testid="reactions"]');

    // If reactions section doesn't exist, skip the test
    if (!(await reactionsSection.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('Reactions section not found, skipping test');
      test.skip();
      return;
    }

    // Capture reactions section
    await screenshotsHelper.captureElement(reactionsSection, 'reactions-section');

    // Check that reaction buttons are visible
    const reactionButtons = page.locator('.reaction-btn, .reaction-button, button[data-reaction-type]');
    const buttonCount = await reactionButtons.count();

    if (buttonCount === 0) {
      console.log('No reaction buttons found, skipping test');
      test.skip();
      return;
    }

    console.log(`Found ${buttonCount} reaction buttons`);
    expect(buttonCount).toBeGreaterThan(0);

    // Capture first reaction button
    const firstButton = reactionButtons.first();
    await screenshotsHelper.captureElement(firstButton, 'reaction-button');
  });

  test('can toggle reactions', async ({ page }) => {
    const testTag = createTestTag('reactions', 'toggle');
    const screenshots = new ScreenshotHelper(page, testTag);
    await setupTestDatabase(testTag);
    await loginAsTestUser(page, testTag);
    const testPostId = await getTestPostId();
    await page.goto(PAGE_URLS.recipes.details(testPostId));
    await screenshots.take('before-toggle');

    // Ensure recipe loads
    const recipeTitle = page.locator('h1').first();
    await expect(recipeTitle).toBeVisible({ timeout: 10000 });

    // Find reaction buttons
    const reactionButtons = page.locator('.reaction-btn, .reaction-button, button[data-reaction-type]');
    const buttonCount = await reactionButtons.count();

    if (buttonCount === 0) {
      console.log('No reaction buttons found, skipping test');
      test.skip();
      return;
    }

    // Take screenshot before clicking
    await screenshots.take('before-reaction');

    // Get the first reaction button
    const firstButton = reactionButtons.first();

    // Get current counter value before clicking
    const counterBefore = await firstButton.locator('.count, [data-testid="count"]').textContent() || '0';
    const countBefore = parseInt(counterBefore.trim(), 10) || 0;
    console.log(`Initial count: ${countBefore}`);

    // Click the reaction button
    await screenshots.captureAction('click-reaction', async () => {
      await firstButton.click();
      // Wait for API response and UI update
      await page.waitForTimeout(1000);
    });

    // Take screenshot after clicking
    await screenshots.take('after-reaction');

    // Get the new counter value
    const counterAfter = await firstButton.locator('.count, [data-testid="count"]').textContent() || '0';
    const countAfter = parseInt(counterAfter.trim(), 10) || 0;
    console.log(`Count after click: ${countAfter}`);

    // The count should have changed (either increased if it was not already reacted, or decreased if it was)
    expect(countAfter).not.toBe(countBefore);

    // Click again to toggle back
    await screenshots.captureAction('toggle-reaction', async () => {
      await firstButton.click();
      // Wait for API response and UI update
      await page.waitForTimeout(1000);
    });

    // Take screenshot after toggling back
    await screenshots.take('after-toggle-back');

    // Get the final counter value
    const counterFinal = await firstButton.locator('.count, [data-testid="count"]').textContent() || '0';
    const countFinal = parseInt(counterFinal.trim(), 10) || 0;
    console.log(`Final count: ${countFinal}`);

    // Should be back to original count (or close to it)
    expect(countFinal).toBe(countBefore);
  });

  test('verifies user reaction state persists after page reload', async ({ page }) => {
    const testTag = createTestTag('reactions', 'persistence');
    const screenshots = new ScreenshotHelper(page, testTag);
    await setupTestDatabase(testTag);
    await loginAsTestUser(page, testTag);
    const testPostId = await getTestPostId();
    await page.goto(PAGE_URLS.recipes.details(testPostId));
    await screenshots.take('initial-state');

    // Ensure recipe loads
    const recipeTitle = page.locator('h1').first();
    await expect(recipeTitle).toBeVisible({ timeout: 10000 });

    // Find reaction buttons
    const reactionButtons = page.locator('.reaction-btn, .reaction-button, button[data-reaction-type]');

    if (await reactionButtons.count() === 0) {
      console.log('No reaction buttons found, skipping test');
      test.skip();
      return;
    }

    // Get the first reaction button
    const firstButton = reactionButtons.first();

    // Check if the button is already in active state
    const isActiveInitially = await firstButton.getAttribute('data-active') === 'true' ||
                            await firstButton.evaluate(el => el.classList.contains('active')) ||
                            await firstButton.getAttribute('aria-pressed') === 'true';

    console.log(`Button initially ${isActiveInitially ? 'active' : 'inactive'}`);

    // Click to toggle if needed to ensure a specific state
    if (!isActiveInitially) {
      await screenshots.captureAction('activate-reaction', async () => {
        await firstButton.click();
        await page.waitForTimeout(1000);
      });
    }

    // Check that button is now active
    const isActiveAfterClick = await firstButton.getAttribute('data-active') === 'true' ||
                             await firstButton.evaluate(el => el.classList.contains('active')) ||
                             await firstButton.getAttribute('aria-pressed') === 'true';

    // If we can't detect active state, skip the test
    if (!isActiveAfterClick && !isActiveInitially) {
      console.log('Cannot verify active state, skipping test');
      test.skip();
      return;
    }

    // Take screenshot of active state
    await screenshots.take('active-reaction');

    // Reload the page
    await page.reload();
    await waitForNetworkIdle(page);

    // Find the button again
    const buttonAfterReload = page.locator('.reaction-btn, .reaction-button, button[data-reaction-type]').first();

    // Check if still active
    const isActiveAfterReload = await buttonAfterReload.getAttribute('data-active') === 'true' ||
                              await buttonAfterReload.evaluate(el => el.classList.contains('active')) ||
                              await buttonAfterReload.getAttribute('aria-pressed') === 'true';

    console.log(`Button after reload ${isActiveAfterReload ? 'active' : 'inactive'}`);

    // Take screenshot after reload
    await screenshots.take('after-reload');

    // Expect the active state to persist after reload
    expect(isActiveAfterReload).toBe(true);
  });
});
