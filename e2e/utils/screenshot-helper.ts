import { Page, Locator } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Utility class to standardize screenshot handling across all E2E tests
 */
export class ScreenshotHelper {
  private page: Page;
  private testName: string;
  private category: string;
  private screenshotsDir: string;

  // Add a static counter to track screenshot count
  private static screenshotCount = 0;
  private static logFrequency = 10; // Only log every 10th screenshot in quiet mode

  /**
   * Creates a new ScreenshotHelper instance
   *
   * @param page Playwright page object
   * @param testName Name of the test (used for screenshot naming)
   * @param category Category folder for screenshots (e.g., 'auth', 'home', 'recipes')
   */
  constructor(page: Page, testName: string, category: string = 'general') {
    this.page = page;
    this.testName = testName.replace(/\s+/g, '-').toLowerCase();
    this.category = category;

    // Create screenshots directory structure
    this.screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots', this.category);
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  /**
   * Take a screenshot with automatic timestamping
   * @param label Label for the screenshot
   * @param element Optional element to screenshot instead of the whole page (string selector or Locator)
   * @returns Path to the screenshot
   */
  async take(label: string, element?: string | Locator): Promise<string> {
    // Skip screenshots if in ultra-quiet mode
    if (process.env.E2E_ULTRA_QUIET_MODE === 'true') {
      return 'screenshot-skipped-in-ultra-quiet-mode';
    }

    // Check if screenshots are enabled via environment variable
    if (process.env.PLAYWRIGHT_SCREENSHOTS !== 'on') {
      return 'screenshots-disabled';
    }

    // Format the date for use in the filename
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const screenshotName = `${this.testName}-${label}-${timestamp}.png`;
    const screenshotPath = path.join(this.screenshotsDir, screenshotName);

    // Ensure the directory exists
    const dirPath = path.dirname(screenshotPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    try {
      // Take the screenshot of the whole page or a specific element
      const options = { path: screenshotPath, fullPage: !element };

      if (element) {
        // Convert string selector to locator if needed
        const elementLocator = typeof element === 'string'
          ? this.page.locator(element).first()
          : element;

        // Only take screenshot if element is visible
        const isVisible = await elementLocator.isVisible();
        if (isVisible) {
          await elementLocator.screenshot(options);
        } else {
          if (process.env.E2E_QUIET_MODE !== 'true') {
            console.log(`Element for screenshot '${label}' not visible, skipping`);
          }
          return 'element-not-visible';
        }
      } else {
        await this.page.screenshot(options);
      }

      // Increment the screenshot count
      ScreenshotHelper.screenshotCount++;

      // Only log if not in quiet mode, or if in quiet mode, only log every Nth screenshot
      const shouldLog = process.env.E2E_QUIET_MODE !== 'true' ||
                        (ScreenshotHelper.screenshotCount % ScreenshotHelper.logFrequency === 0);

      if (shouldLog) {
        const countInfo = process.env.E2E_QUIET_MODE === 'true'
          ? ` (${ScreenshotHelper.screenshotCount} total)`
          : '';
        console.log(`Screenshot saved: ${screenshotPath}${countInfo}`);
      }

      return screenshotPath;
    } catch (error: any) {
      if (process.env.E2E_QUIET_MODE !== 'true') {
        console.error(`Error taking screenshot '${label}':`, error.message);
      }
      return 'screenshot-error';
    }
  }

  /**
   * Take before/after screenshots around an action
   *
   * @param actionName Name of the action being performed
   * @param action Function to execute between screenshots
   * @returns Object containing paths to before and after screenshots
   */
  async captureAction(actionName: string, action: () => Promise<void>): Promise<{before: string, after: string}> {
    // Skip if in ultra-quiet mode
    if (process.env.E2E_ULTRA_QUIET_MODE === 'true') {
      await action();
      return { before: 'skipped', after: 'skipped' };
    }

    let before = 'skipped';
    let after = 'skipped';

    try {
      before = await this.take(`before-${actionName}`);
      await action();
      after = await this.take(`after-${actionName}`);
    } catch (error: any) {
      // Only log if not in quiet mode
      if (process.env.E2E_QUIET_MODE !== 'true') {
        console.error(`Error during action capture '${actionName}':`, error.message);
      }
      // Try to take an "error" screenshot
      try {
        await this.take(`error-${actionName}`);
      } catch {
        // Ignore error taking the error screenshot
      }
    }

    return { before, after };
  }

  /**
   * Capture a form submission with before/after screenshots
   *
   * @param formSelector Selector for the form or submit button
   * @returns Object containing paths to before and after screenshots
   */
  async captureFormSubmission(formSelector: string): Promise<{before: string, after: string}> {
    // Skip if in ultra-quiet mode
    if (process.env.E2E_ULTRA_QUIET_MODE === 'true') {
      const submitButton = this.page.locator(formSelector);
      await submitButton.click();
      await this.page.waitForTimeout(1000); // Wait for response
      return { before: 'skipped', after: 'skipped' };
    }

    let before = 'skipped';
    let after = 'skipped';

    try {
      const submitButton = this.page.locator(formSelector);

      // Take before screenshot
      before = await this.take('before-submit');

      // Submit the form
      await submitButton.click();
      await this.page.waitForTimeout(1000); // Wait for response

      // Take after screenshot
      after = await this.take('after-submit');
    } catch (error: any) {
      // Only log if not in quiet mode
      if (process.env.E2E_QUIET_MODE !== 'true') {
        console.error(`Error during form submission:`, error.message);
      }
      // Try to take an error screenshot
      try {
        await this.take('error-submit');
      } catch {
        // Ignore error taking the error screenshot
      }
    }

    return { before, after };
  }

  /**
   * Capture a screenshot of a specific element
   * @param selector Either a string selector or a Locator object
   * @param label Label for the screenshot
   * @returns Path to screenshot or null if element not found
   */
  async captureElement(selector: string | Locator, label: string): Promise<string | null> {
    // Skip screenshots if in ultra-quiet mode
    if (process.env.E2E_ULTRA_QUIET_MODE === 'true') {
      return null;
    }

    try {
      // Take screenshot using the more resilient take method
      return await this.take(`element-${label}`, selector);
    } catch (error: any) {
      // Only log if not in quiet mode
      if (process.env.E2E_QUIET_MODE !== 'true') {
        console.error(`Error capturing element for '${label}':`, error.message);
      }
      return null;
    }
  }
}
