import { Page, Locator } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { createTestTag, getTestRunTimestamp } from './test-tag';

/**
 * Utility class to standardize screenshot handling across all E2E tests
 */
export class ScreenshotHelper {
  private page: Page;
  private testName: string;
  private category: string;
  private screenshotsDir: string;
  private testId: string;
  private testTag: string;

  // Add a static counter to track screenshot count
  private static screenshotCount = 0;
  private static logFrequency = 10; // Only log every 10th screenshot in quiet mode

  /**
   * Creates a new ScreenshotHelper instance
   *
   * @param page Playwright page object
   * @param testName Name of the test (used for screenshot naming)
   * @param category Category folder for screenshots (e.g., 'auth', 'home', 'recipes')
   * @param testId Optional test ID for linking screenshots to test runs
   * @param testTag Optional test tag created with createTestTag for consistent tagging
   */
  constructor(
    page: Page,
    testName: string,
    category: string = 'general',
    testId: string = '',
    testTag?: string
  ) {
    this.page = page;
    this.testName = testName.replace(/\s+/g, '-').toLowerCase();
    this.category = category;
    this.testId = testId;

    // If a test tag was provided, use it; otherwise create one from component (category) and test (testName)
    this.testTag = testTag || createTestTag(this.category, this.testName);

    // Create screenshots directory structure
    this.screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots', this.category);
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }

    // Write test metadata including the new test tag
    this.writeTestMetadata();
  }

  /**
   * Set the current test ID for better screenshot organization
   * @param testId Unique identifier for the test
   */
  setTestId(testId: string): void {
    this.testId = testId;
    this.writeTestMetadata();
  }

  /**
   * Set a custom test tag for better screenshot organization and traceability
   * @param componentType Type of component being tested
   * @param testType Type of test being performed
   * @param customIdentifier Optional additional identifier
   */
  setTestTag(componentType: string, testType: string, customIdentifier?: string): void {
    this.testTag = createTestTag(componentType, testType, customIdentifier);
    this.writeTestMetadata();
  }

  /**
   * Set a pre-generated test tag
   * @param testTag A test tag string created with createTestTag
   */
  setExistingTestTag(testTag: string): void {
    this.testTag = testTag;
    this.writeTestMetadata();
  }

  /**
   * Write test metadata to a file to help associate screenshots with tests
   */
  private writeTestMetadata(): void {
    const metadataPath = path.join(this.screenshotsDir, `${this.testName}-metadata.json`);
    const metadata = {
      testId: this.testId,
      testName: this.testName,
      category: this.category,
      testTag: this.testTag,
      timestamp: new Date().toISOString(),
      runTimestamp: getTestRunTimestamp()
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
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

    // Format the date for use in the filename - include the test tag
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const screenshotName = `${this.testName}-${label}-${this.testTag}-${timestamp}.png`;
    const screenshotPath = path.join(this.screenshotsDir, screenshotName);

    // Ensure the directory exists
    const dirPath = path.dirname(screenshotPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Create metadata object for this screenshot
    const writeMetadata = (actualPath: string, isFallback: boolean = false) => {
      const metadataPath = path.join(this.screenshotsDir, `${this.testName}-${label}-${timestamp}.json`);
      const metadata = {
        testId: this.testId,
        testName: this.testName,
        category: this.category,
        testTag: this.testTag,
        label,
        timestamp: new Date().toISOString(),
        runTimestamp: getTestRunTimestamp(),
        screenshotPath: actualPath,
        elementScreenshot: !!element,
        isFallback
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    };

    try {
      // Take the screenshot of the whole page or a specific element
      const options = { path: screenshotPath, fullPage: !element };
      let actualPath = screenshotPath;
      let isFallback = false;

      if (element) {
        try {
          // Convert string selector to locator if needed
          const elementLocator = typeof element === 'string'
            ? this.page.locator(element).first()
            : element;

          // Check if element is visible before taking screenshot
          const isVisible = await elementLocator.isVisible().catch(() => false);

          if (isVisible) {
            await elementLocator.screenshot(options).catch(async (error) => {
              // If we got an error for the element screenshot, fall back to page
              console.log(`Error taking element screenshot: ${error.message}`);
              console.log('Falling back to page screenshot');
              await this.page.screenshot(options);
              isFallback = true;
            });
          } else {
            console.log(`Element for screenshot '${label}' not visible, taking page screenshot instead`);
            await this.page.screenshot(options);
            actualPath = `${screenshotPath}-fallback-page`;
            isFallback = true;
          }
        } catch (elementError) {
          console.log(`Error with element for screenshot '${label}': ${elementError instanceof Error ? elementError.message : String(elementError)}`);
          console.log('Falling back to page screenshot');
          await this.page.screenshot(options);
          actualPath = `${screenshotPath}-fallback-page`;
          isFallback = true;
        }
      } else {
        await this.page.screenshot(options);
      }

      // Write metadata with the correct path
      writeMetadata(actualPath, isFallback);

      // Increment the screenshot count
      ScreenshotHelper.screenshotCount++;

      // Only log if not in quiet mode, or if in quiet mode, only log every Nth screenshot
      const shouldLog = process.env.E2E_QUIET_MODE !== 'true' ||
                        (ScreenshotHelper.screenshotCount % ScreenshotHelper.logFrequency === 0);

      if (shouldLog) {
        const countInfo = process.env.E2E_QUIET_MODE === 'true'
          ? ` (${ScreenshotHelper.screenshotCount} total)`
          : '';
        console.log(`Screenshot saved: ${actualPath}${countInfo}`);
      }

      return actualPath;
    } catch (error: any) {
      console.error(`Error taking screenshot '${label}':`, error.message);

      // Try to take a simple screenshot as fallback
      try {
        const fallbackPath = path.join(this.screenshotsDir, `${this.testName}-fallback-${timestamp}.png`);
        await this.page.screenshot({ path: fallbackPath });

        // Write metadata for the fallback screenshot
        writeMetadata(fallbackPath, true);

        console.log(`Fallback screenshot saved: ${fallbackPath}`);
        return fallbackPath;
      } catch {
        return 'screenshot-error-with-failed-fallback';
      }
    }
  }

  /**
   * Take before/after screenshots around an action
   *
   * @param actionName Name of the action being performed
   * @param action Function to execute between screenshots
   * @returns Object containing paths to before and after screenshots
   */
  async captureAction(actionName: string, action: () => Promise<void>): Promise<{before: string, after: string, error?: string}> {
    // Skip if in ultra-quiet mode
    if (process.env.E2E_ULTRA_QUIET_MODE === 'true') {
      try {
        await action();
        return { before: 'skipped', after: 'skipped' };
      } catch (error: any) {
        return { before: 'skipped', after: 'skipped', error: error.message };
      }
    }

    let before = 'skipped';
    let after = 'skipped';
    let errorScreenshot = '';

    try {
      before = await this.take(`before-${actionName}`);
      await action();
      after = await this.take(`after-${actionName}`);
    } catch (error: any) {
      // Log the error regardless of quiet mode for action failures
      console.error(`Error during action '${actionName}':`, error.message);

      // Try to take an "error" screenshot
      try {
        errorScreenshot = await this.take(`error-${actionName}`);
        console.log(`Captured error state in screenshot: ${errorScreenshot}`);
      } catch (screenshotError) {
        console.error(`Failed to take error screenshot: ${screenshotError instanceof Error ? screenshotError.message : String(screenshotError)}`);
      }

      // Return error details
      return { before, after, error: error.message };
    }

    return { before, after };
  }

  /**
   * Capture a form submission with before/after screenshots
   *
   * @param formSelector Selector for the form or submit button
   * @returns Object containing paths to before and after screenshots
   */
  async captureFormSubmission(formSelector: string): Promise<{before: string, after: string, error?: string}> {
    // Skip if in ultra-quiet mode
    if (process.env.E2E_ULTRA_QUIET_MODE === 'true') {
      try {
        const submitButton = this.page.locator(formSelector);
        await submitButton.click();
        await this.page.waitForTimeout(1000); // Wait for response
        return { before: 'skipped', after: 'skipped' };
      } catch (error: any) {
        return { before: 'skipped', after: 'skipped', error: error.message };
      }
    }

    let before = 'skipped';
    let after = 'skipped';
    let errorScreenshot = '';

    try {
      // Try to find the form or submit button with more resilient approach
      let submitButton;

      try {
        // First try the exact selector
        submitButton = this.page.locator(formSelector);
        if (!(await submitButton.isVisible())) {
          // Fall back to more generic selectors if the specific one isn't visible
          submitButton = this.page.locator('button[type="submit"], input[type="submit"], [role="button"]:has-text("Submit")').first();
        }
      } catch {
        // If first attempt fails, fall back to generic submit buttons
        submitButton = this.page.locator('button[type="submit"], input[type="submit"], [role="button"]:has-text("Submit")').first();
      }

      // Take before screenshot
      before = await this.take('before-submit');

      // Submit the form
      await submitButton.click();
      await this.page.waitForTimeout(1000); // Wait for response

      // Take after screenshot
      after = await this.take('after-submit');
    } catch (error: any) {
      // Log error regardless of quiet mode for form submission failures
      console.error(`Error during form submission:`, error.message);

      // Try to take an error screenshot
      try {
        errorScreenshot = await this.take('error-submit');
        console.log(`Captured form submission error in screenshot: ${errorScreenshot}`);
      } catch {
        // Ignore error taking the error screenshot
      }

      return { before, after, error: error.message };
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
      // Use the more resilient take method which handles errors internally
      const path = await this.take(`element-${label}`, selector);
      return path;
    } catch (error: any) {
      console.error(`Error capturing element for '${label}':`, error.message);

      // Try to take a screenshot of the page as fallback
      try {
        const fallbackPath = await this.take(`element-fallback-${label}`);
        console.log(`Took fallback page screenshot instead of element: ${fallbackPath}`);
        return fallbackPath;
      } catch {
        return null;
      }
    }
  }

  /**
   * Capture current page state with error information
   * Useful when a test encounters an unexpected state
   *
   * @param errorMessage Description of the error
   * @returns Path to the error screenshot
   */
  async captureError(errorMessage: string): Promise<string> {
    // Create an error marker for screenshot name
    const safeErrorId = errorMessage.substring(0, 20)
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();

    // Take a screenshot with the error message
    const screenshotPath = await this.take(`error-${safeErrorId}`);

    // Also save the error details to a text file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const errorFilePath = path.join(this.screenshotsDir, `${this.testName}-error-${timestamp}.txt`);

    // Include current URL and page title for debugging
    let errorDetails = `Error: ${errorMessage}\n`;
    errorDetails += `URL: ${this.page.url()}\n`;

    try {
      errorDetails += `Title: ${await this.page.title()}\n`;
      errorDetails += `Time: ${new Date().toISOString()}\n`;
      errorDetails += `Screenshot: ${screenshotPath}\n`;

      // Save error details
      fs.writeFileSync(errorFilePath, errorDetails);
    } catch (e) {
      console.error(`Failed to save detailed error info: ${e}`);
    }

    return screenshotPath;
  }
}
