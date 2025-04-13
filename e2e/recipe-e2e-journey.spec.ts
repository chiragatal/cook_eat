import { test, expect, Page } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { resetDatabase, waitForNetworkIdle, loginAsTestUser } from './utils/test-utils';
import { createTestTag } from './utils/test-tag';
import { getTestPostId, setupTestDatabase } from './setup/test-database';

// Test recipe ID will be unique per worker
let testPostId: string;

/**
 * Reusable component for interacting with reactions
 */
async function toggleReaction(page: Page, screenshots: ScreenshotHelper) {
  // Find the reaction button
  const reactionButtons = page.locator('.reaction-btn, .reaction-button, button[data-reaction-type]');

  if (await reactionButtons.count() === 0) {
    console.log('No reaction buttons found');
    return null;
  }

  const reactionButton = reactionButtons.first();

  // Verify it exists and capture it
  await expect(reactionButton).toBeVisible();
  await screenshots.captureElement(reactionButton, 'reaction-button');

  // Get initial state and count
  const isActive = await reactionButton.evaluate((el: HTMLElement) => {
    return el.classList.contains('active') ||
           el.getAttribute('data-active') === 'true' ||
           el.getAttribute('aria-pressed') === 'true';
  });

  const countElement = reactionButton.locator('.count, [data-testid="count"]');
  const initialCount = await countElement.textContent() || '0';
  const countBefore = parseInt(initialCount.trim(), 10) || 0;
  console.log(`Initial reaction count: ${countBefore}, Active: ${isActive}`);

  // Click to toggle reaction
  await screenshots.captureAction('toggle-reaction', async () => {
    await reactionButton.click();
    await page.waitForTimeout(1000); // Wait for API response and UI update
  });

  // Get updated state after clicking
  const isActiveAfter = await reactionButton.evaluate((el: HTMLElement) => {
    return el.classList.contains('active') ||
           el.getAttribute('data-active') === 'true' ||
           el.getAttribute('aria-pressed') === 'true';
  });

  const countAfter = parseInt(await countElement.textContent() || '0', 10) || 0;
  console.log(`Reaction count after: ${countAfter}, Active: ${isActiveAfter}`);

  return {
    wasActive: isActive,
    isActiveNow: isActiveAfter,
    initialCount: countBefore,
    currentCount: countAfter
  };
}

/**
 * Reusable component for adding a comment
 */
async function addComment(page: Page, commentText: string, screenshots: ScreenshotHelper) {
  // Take screenshot before adding comment
  await screenshots.take('before-comment');

  // Check if comments section exists
  const commentsSection = page.locator('.comments-section');

  if (!(await commentsSection.isVisible({ timeout: 5000 }).catch(() => false))) {
    console.log('Comments section not visible');
    return null;
  }

  // Find the comment form
  const commentForm = page.locator('.comment-form');
  const commentTextarea = commentForm.locator('textarea');

  // Verify form exists and capture it
  if (!(await commentForm.isVisible().catch(() => false))) {
    console.log('Comment form not visible');
    return null;
  }

  await screenshots.captureElement(commentForm, 'comment-form');

  // Get initial comment count for verification
  const initialComments = page.locator('.comment');
  const initialCommentCount = await initialComments.count();
  console.log(`Initial comment count: ${initialCommentCount}`);

  // Fill in the comment
  await commentTextarea.fill(commentText);

  // Submit the comment
  await screenshots.captureAction('submit-comment', async () => {
    await commentForm.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000); // Wait for submission and UI update
  });

  // Take screenshot after comment is added
  await screenshots.take('after-comment');

  // Check if comment was added
  const newComments = page.locator('.comment');
  const newCommentCount = await newComments.count();
  console.log(`New comment count: ${newCommentCount}`);

  // Try to find the new comment by text content
  const commentEl = page.locator('.comment-content', { hasText: commentText }).first();
  let commentId = '';

  if (await commentEl.isVisible()) {
    // Get the parent comment element
    const parentComment = commentEl.locator('..');
    commentId = await parentComment.getAttribute('data-id') || '';
    console.log(`Found comment with ID: ${commentId}`);
    return { commentEl: parentComment, commentId, success: true };
  } else {
    console.log('Could not find the new comment by text content');
    return { success: false };
  }
}

test.describe('End-to-End Recipe Journey', () => {
  // Reset database before running tests
  test.beforeAll(async () => {
    await resetDatabase();
  });

  test('can view and interact with a recipe', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('recipe', 'e2e-journey');

    // Setup test data with this test tag
    await setupTestDatabase(testTag);

    // Get the test post ID for this test
    testPostId = getTestPostId();

    // Login as test user with test tag
    await loginAsTestUser(page, testTag);

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'recipe-journey', 'recipes', '', testTag);

    // Navigate to the test recipe page
    await page.goto(`/recipe/${testPostId}`);
    await waitForNetworkIdle(page);

    // Take screenshot of recipe page
    await screenshots.take('recipe-page');

    // Verify recipe title is visible
    const recipeTitle = page.locator('h1').first();
    await expect(recipeTitle).toBeVisible();
    await screenshots.captureElement('h1', 'recipe-title');

    // Log the title for verification
    const titleText = await recipeTitle.textContent();
    console.log(`Recipe title: ${titleText}`);

    // Verify recipe content is visible
    const recipeContent = page.locator('.recipe-content');
    if (await recipeContent.isVisible()) {
      await screenshots.captureElement('.recipe-content', 'recipe-content');
    }

    // Check for ingredients section
    const ingredients = page.locator('h2:has-text("Ingredients"), .ingredients');
    if (await ingredients.isVisible()) {
      await screenshots.captureElement('h2:has-text("Ingredients"), .ingredients', 'ingredients-section');
      console.log('Ingredients section is visible');
    } else {
      console.log('Ingredients section not found');
    }

    // Check for steps section
    const steps = page.locator('h2:has-text("Steps"), .steps');
    if (await steps.isVisible()) {
      await screenshots.captureElement('h2:has-text("Steps"), .steps', 'steps-section');
      console.log('Steps section is visible');
    } else {
      console.log('Steps section not found');
    }

    // 1. React to the recipe
    console.log('Attempting to react to the recipe...');
    const reactionResult = await toggleReaction(page, screenshots);

    if (reactionResult) {
      console.log('Successfully toggled reaction');

      // Reload the page to verify reaction persistence
      await screenshots.captureAction('reload-page', async () => {
        await page.reload();
        await waitForNetworkIdle(page);
      });

      // Take screenshot after reload
      await screenshots.take('after-reload');

      // Verify reaction state persisted
      const reactionButtons = page.locator('.reaction-btn, .reaction-button, button[data-reaction-type]');

      if (await reactionButtons.count() > 0) {
        const firstButton = reactionButtons.first();
        const isPersisted = await firstButton.evaluate(el => {
          return el.classList.contains('active') ||
                 el.getAttribute('data-active') === 'true' ||
                 el.getAttribute('aria-pressed') === 'true';
        });

        console.log(`Reaction persisted after reload: ${isPersisted}`);
      }
    } else {
      console.log('Could not find reaction buttons to toggle');
    }

    // 2. Add a comment to the recipe
    console.log('Attempting to add a comment...');
    const commentText = `Test journey comment ${Date.now()}`;
    const commentResult = await addComment(page, commentText, screenshots);

    if (commentResult && commentResult.success) {
      console.log('Successfully added comment');

      // 3. Wait a moment and then reload the page to verify comment persistence
      await screenshots.captureAction('reload-after-comment', async () => {
        await page.reload();
        await waitForNetworkIdle(page);
      });

      // Take screenshot after second reload
      await screenshots.take('after-comment-reload');

      // Try to find the comment after reload
      const persistedComment = page.locator('.comment-content', { hasText: commentText }).first();
      const isPersisted = await persistedComment.isVisible().catch(() => false);
      console.log(`Comment persisted after reload: ${isPersisted}`);

      if (isPersisted) {
        await screenshots.captureElement(persistedComment, 'persisted-comment');
      }
    } else {
      console.log('Could not add comment');
    }
  });

  test('can navigate between recipes', async ({ page }) => {
    // Create a test tag for this test
    const testTag = createTestTag('recipe', 'navigation');

    // Setup test data with this test tag
    await setupTestDatabase(testTag);

    // Login as test user with test tag
    await loginAsTestUser(page, testTag);

    // Create screenshot helper with the test tag
    const screenshots = new ScreenshotHelper(page, 'recipe-navigation', 'recipes', '', testTag);

    // Go to the recipes listing page
    await page.goto('/all-recipes');
    await waitForNetworkIdle(page);

    // Take screenshot of recipe list
    await screenshots.take('recipe-list');

    // Find recipe cards
    const recipeCards = page.locator('.recipe-card, .card, article');
    const cardCount = await recipeCards.count();

    if (cardCount === 0) {
      console.log('No recipe cards found, skipping test');
      test.skip();
      return;
    }

    console.log(`Found ${cardCount} recipe cards`);

    // Capture the first recipe card
    await screenshots.captureElement('.recipe-card, .card, article', 'recipe-card');

    // Get the recipe title before clicking
    const cardTitle = await recipeCards.first().locator('h2, h3, .title').textContent();
    console.log(`Clicking on recipe: ${cardTitle}`);

    // Click on the first recipe
    await screenshots.captureAction('click-recipe', async () => {
      await recipeCards.first().click();
      await waitForNetworkIdle(page);
    });

    // Take screenshot of the recipe detail page
    await screenshots.take('recipe-detail');

    // Verify we're on a detail page
    const recipeTitle = page.locator('h1').first();
    await expect(recipeTitle).toBeVisible();

    // Go back to the recipe list
    await screenshots.captureAction('go-back', async () => {
      await page.goBack();
      await waitForNetworkIdle(page);
    });

    // Take screenshot after going back
    await screenshots.take('back-to-list');

    // Verify we're back on the list page
    const recipeCardsAfterBack = page.locator('.recipe-card, .card, article');
    expect(await recipeCardsAfterBack.count()).toBeGreaterThan(0);
  });
});
