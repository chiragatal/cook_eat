import { defineConfig, devices } from '@playwright/test';
import { join } from 'path';
import dotenv from 'dotenv';
import { getBaseUrl } from './e2e/utils/urls';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Get base URL from centralized configuration
const baseURL = getBaseUrl();

// Check if we should enable quiet mode to reduce log noise
const quietMode = process.env.E2E_QUIET_MODE === 'true';

// Check if we should enable ultra-quiet mode (minimal output - test results only)
const ultraQuietMode = process.env.E2E_ULTRA_QUIET_MODE === 'true';

// Determine the most appropriate quiet level
const logLevel = ultraQuietMode ? 'ultra-quiet' : (quietMode ? 'quiet' : 'normal');

// Determine if screenshots should be taken during tests
const takeScreenshots = process.env.PLAYWRIGHT_SCREENSHOTS === 'on';

// Determine if video should be recorded during tests
const recordVideo = process.env.PLAYWRIGHT_VIDEO === 'on';

// Define where test artifacts like screenshots and videos should be stored
const artifactsDir = join('test-results', 'latest', 'artifacts');

// Log configuration (unless in ultra-quiet mode)
if (logLevel !== 'ultra-quiet') {
  console.log(`Using test base URL: ${baseURL}`);
  console.log(`Using preview deployment: YES`);
  console.log(`Using preview database: YES`);
  console.log(`Quiet mode: ${logLevel === 'quiet' ? 'YES' : 'NO'}`);
  console.log(`Screenshots enabled: ${takeScreenshots ? 'YES' : 'NO'}`);
  console.log(`Video recording enabled: ${recordVideo ? 'YES' : 'NO'}`);
  console.log(`Starting local web server: NO`);
}

export default defineConfig({
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,

  /* Only look for tests in the e2e directory */
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    // Always use the minimal reporter for ultra-quiet mode
    ultraQuietMode ? ['list', { printSteps: false, printFailureReasons: false }] :
    // Use configurable steps/reasons for quiet mode
    ['list', { printSteps: !quietMode, printFailureReasons: true }],

    // Always generate HTML report for later viewing
    ['html', { outputFolder: 'test-results/latest/html-report', open: 'never' }],

    // Use our custom reporter to attach screenshots to the HTML report
    ['./e2e/custom-reporter.ts']
  ],

  /* Set up global setup that runs before all tests */
  globalSetup: require.resolve('./e2e/global-setup'),

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: takeScreenshots ? 'on' : 'off',
        video: recordVideo ? 'on' : 'off',
        trace: 'on-first-retry',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        screenshot: takeScreenshots ? 'on' : 'off',
        video: recordVideo ? 'on' : 'off',
        trace: 'on-first-retry',
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        screenshot: takeScreenshots ? 'on' : 'off',
        video: recordVideo ? 'on' : 'off',
        trace: 'on-first-retry',
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        screenshot: takeScreenshots ? 'on' : 'off',
        video: recordVideo ? 'on' : 'off',
        trace: 'on-first-retry',
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 13'],
        screenshot: takeScreenshots ? 'on' : 'off',
        video: recordVideo ? 'on' : 'off',
        trace: 'on-first-retry',
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: join(artifactsDir, 'output'),

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 10000,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Directory to save screenshots in */
    screenshot: {
      mode: 'on',
      fullPage: true,
    },

    // Store videos in artifacts directory
    video: recordVideo ? {
      mode: 'on',
    } : 'off',
  },

  /* No local webserver since we're always using the preview URL */
  webServer: undefined,
});
