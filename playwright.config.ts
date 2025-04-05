import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load the appropriate environment variables
if (fs.existsSync('.env.test')) {
  console.log('Loading .env.test file');
  dotenv.config({ path: '.env.test' });
}

// We'll use the environment variable set by setup-test-results-dir.js
// or create the path to the 'latest' symlink if not available
const testResultsBaseDir = path.join(__dirname, 'test-results');
const testResultsDir = process.env.TEST_RESULTS_DIR
  ? process.env.TEST_RESULTS_DIR
  : path.join(testResultsBaseDir, 'latest');

// Define directory paths
const reportsDir = path.join(testResultsDir, 'html-report');
const artifactsDir = path.join(testResultsDir, 'artifacts');
const screenshotsDir = path.join(artifactsDir, 'screenshots');
const screenshotsDebugDir = path.join(screenshotsDir, 'debug');
const screenshotsFailuresDir = path.join(screenshotsDir, 'failures');
const videosDir = path.join(artifactsDir, 'videos');
const tracesDir = path.join(artifactsDir, 'traces');

// Log the test results directory being used
console.log(`Playwright using test results directory: ${testResultsDir}`);

// Determine the base URL - use TEST_BASE_URL environment variable if set
// otherwise default to localhost. Allow preview-specific scripts to
// override this with a direct URL.
const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
console.log(`Using test base URL: ${baseUrl}`);

// Check if screenshots are enabled via environment variable
const screenshotsOn = process.env.PLAYWRIGHT_SCREENSHOTS === 'on';
const videoOn = process.env.PLAYWRIGHT_VIDEO === 'on';

console.log(`Screenshots enabled: ${screenshotsOn ? 'YES' : 'NO'}`);
console.log(`Video recording enabled: ${videoOn ? 'YES' : 'NO'}`);

// Determine if we should start a local web server
// We only need to start the server if we're testing against localhost
const shouldStartWebServer = baseUrl.includes('localhost');
console.log(`Starting local web server: ${shouldStartWebServer ? 'YES' : 'NO'}`);

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: process.env.CI ? true : false,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  // Updated reporter configuration to use the date-specific folder
  reporter: [
    ['html', { outputFolder: reportsDir }],
    ['list']
  ],

  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),

  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    // Take screenshots based on environment variable or on failure
    screenshot: screenshotsOn ? 'on' : 'only-on-failure',
    // Record video based on environment variable or on first retry
    video: videoOn ? 'on' : 'on-first-retry',

    // Set custom paths for artifacts
    screenshotPath: screenshotsDir,
    videoPath: videosDir,
    tracesPath: tracesDir,
  },

  // Screenshots for snapshots and visual regression tests
  snapshotPathTemplate: path.join(artifactsDir, '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}'),

  // Store artifacts in the artifacts folder
  outputDir: artifactsDir,

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'authenticated',
      testMatch: /.*\.auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'e2e/setup/auth-state.json'),
      },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro 11'] },
    },
  ],

  // Only start a web server when testing locally
  webServer: shouldStartWebServer ? {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      TEST_MODE: 'true',
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '',
    },
    timeout: 60 * 1000,
  } : undefined,
});
