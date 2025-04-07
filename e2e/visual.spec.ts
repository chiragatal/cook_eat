import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from './utils/screenshot-helper';
import { takeDebugScreenshot, waitForNetworkIdle } from './utils/test-utils';
import fs from 'fs';
import path from 'path';

// Pages to take screenshots of - updated to use paths that exist in the app
const pages = [
  { name: 'Home', path: '/' },
  { name: 'AllRecipes', path: '/all-recipes' },
  { name: 'MyRecipes', path: '/my-recipes' },
  { name: 'Auth', path: '/auth/signin' },
  { name: 'Register', path: '/auth/signup' },
];

// Devices to test
const devices = [
  { name: 'Desktop', width: 1280, height: 800 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 },
];

test.describe('Visual regression testing', () => {
  // Set a longer timeout for visual tests
  test.setTimeout(30000);

  for (const pageConfig of pages) {
    for (const device of devices) {
      test(`${pageConfig.name} page on ${device.name}`, async ({ page }) => {
        // Create screenshot helper
        const screenshots = new ScreenshotHelper(
          page,
          `${pageConfig.name.toLowerCase()}-${device.name.toLowerCase()}`,
          'visual'
        );

        // Track any errors we find during the test
        let pageErrorsDetected = false;
        let errorMessages = [];

        try {
          // Capture the viewport resize
          await screenshots.captureAction('resize-viewport', async () => {
            // Set viewport size
            await page.setViewportSize({ width: device.width, height: device.height });
          });

          // Take a debug screenshot before navigation
          await takeDebugScreenshot(page, `${pageConfig.name}-${device.name}-before-nav`, 'visual');

          // Capture the navigation to the page
          const navResult = await screenshots.captureAction('page-navigation', async () => {
            // Navigate to the page with better error handling
            try {
              await page.goto(pageConfig.path, { timeout: 15000 });
            } catch (e) {
              errorMessages.push(`Navigation to ${pageConfig.path} failed: ${e instanceof Error ? e.message : String(e)}`);
              pageErrorsDetected = true;
              console.log(`Navigation error for ${pageConfig.path}: ${e instanceof Error ? e.message : String(e)}`);
            }

            // Wait for page to stabilize
            try {
              await waitForNetworkIdle(page);
            } catch (e) {
              console.log(`Network idle timeout for ${pageConfig.path}, continuing`);
            }

            // Additional wait for any animations/loading to complete
            await page.waitForTimeout(1000);
          });

          // Check if the navigation action had an error
          if (navResult.error) {
            errorMessages.push(`Navigation error: ${navResult.error}`);
            pageErrorsDetected = true;
          }

          // Take a debug screenshot after navigation for troubleshooting
          await takeDebugScreenshot(page, `${pageConfig.name}-${device.name}-after-nav`, 'visual');

          // Take a standardized screenshot
          await screenshots.take('visual-comparison');

          // Check for error messages on the page - with valid selectors
          const errorSelectors = [
            '[role="alert"]',
            '.error',
            '[class*="error"]',
            '[class*="alert"]'
          ];

          // Check each error selector individually
          for (const selector of errorSelectors) {
            const elements = page.locator(selector);
            if (await elements.count() > 0) {
              pageErrorsDetected = true;
              const error = await elements.first().textContent() || 'Unknown error';
              errorMessages.push(`Error element found on page: ${error}`);
              await screenshots.captureElement(elements.first(), `error-${selector.replace(/[^\w]/g, '-')}`);
            }
          }

          // Check for common error text in page content
          const errorTextPatterns = ['error', 'failed', 'crashed', '404 not found'];
          const bodyText = await page.locator('body').textContent() || '';

          for (const pattern of errorTextPatterns) {
            if (bodyText.toLowerCase().includes(pattern)) {
              pageErrorsDetected = true;
              errorMessages.push(`Error text found on page: "${pattern}"`);
            }
          }

          // Look for key UI elements to check page loaded properly
          const contentSelector = 'main, article, section, [role="main"], div.container';
          const content = page.locator(contentSelector).first();

          // If we can't find main content, the page might be broken
          if (!(await content.isVisible())) {
            pageErrorsDetected = true;
            errorMessages.push(`No main content found using selector: ${contentSelector}`);
          } else {
            await screenshots.captureElement(content, 'main-content');
          }

          // Check page title to make sure we're on the right page
          const title = await page.title();
          if (!title || title.toLowerCase().includes('error') || title.includes('404')) {
            pageErrorsDetected = true;
            errorMessages.push(`Problematic page title: "${title}"`);
          }

          // Don't do the visual comparison if we detected errors
          if (pageErrorsDetected) {
            // Save error details to file
            const errorDir = path.join(process.cwd(), 'test-results', 'visual-errors');
            if (!fs.existsSync(errorDir)) {
              fs.mkdirSync(errorDir, { recursive: true });
            }

            const errorLog = path.join(errorDir, `${pageConfig.name}-${device.name}-errors.txt`);
            const errorDetails = [
              `Time: ${new Date().toISOString()}`,
              `Page: ${pageConfig.name}`,
              `Device: ${device.name}`,
              `URL: ${page.url()}`,
              `Title: ${title}`,
              'Errors:',
              ...errorMessages.map(msg => `- ${msg}`)
            ].join('\n');

            fs.writeFileSync(errorLog, errorDetails);

            // Take final error screenshot
            await screenshots.captureError(`${pageConfig.name}-${device.name}-has-errors`);

            // Fail the test with error details
            test.fail(true, `Page errors detected: ${errorMessages.join('; ')}`);
          } else {
            // Take a screenshot for visual comparison only if no errors detected
            try {
              await expect(page).toHaveScreenshot(`${pageConfig.name}-${device.name}.png`, {
                fullPage: false,
                maxDiffPixelRatio: 0.1,
                threshold: 0.3,
                animations: 'disabled',
              });
            } catch (e) {
              console.log(`Visual comparison failed: ${e instanceof Error ? e.message : String(e)}`);
              test.fail(true, `Visual comparison failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        } catch (e) {
          console.error(`Error in visual test for ${pageConfig.name} on ${device.name}:`, e instanceof Error ? e.message : String(e));

          // Capture the error state
          await screenshots.captureError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);

          // Fail the test instead of skipping it
          test.fail(true, `Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    }
  }
});
