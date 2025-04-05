import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load the appropriate environment variables
if (fs.existsSync('.env.test')) {
  console.log('Loading .env.test file');
  dotenv.config({ path: '.env.test' });
}

// Create a date-stamped folder for test results
const currentDate = new Date();
const dateString = currentDate.toISOString().replace(/:/g, '-').replace(/\..+/, '');
const testResultsDir = path.join(__dirname, 'test-results', dateString);
const screenshotsDir = path.join(testResultsDir, 'screenshots');
const screenshotsDebugDir = path.join(screenshotsDir, 'debug');
const screenshotsFailuresDir = path.join(screenshotsDir, 'failures');
const reportsDir = path.join(testResultsDir, 'reports');
const videosDir = path.join(testResultsDir, 'videos');
const tracesDir = path.join(testResultsDir, 'traces');

// Create all test result directories
[
  testResultsDir,
  screenshotsDir,
  screenshotsDebugDir,
  screenshotsFailuresDir,
  reportsDir,
  videosDir,
  tracesDir
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create a symlink to the most recent test results
const latestDir = path.join(__dirname, 'test-results', 'latest');
if (fs.existsSync(latestDir)) {
  try {
    fs.unlinkSync(latestDir);
  } catch (error) {
    console.warn('Could not remove latest symlink:', error);
  }
}
try {
  fs.symlinkSync(dateString, latestDir, 'dir');
  console.log(`Created symlink to latest test results: ${latestDir} -> ${dateString}`);
} catch (error) {
  console.warn('Could not create latest symlink:', error);
}

// Log the test results directory being used
console.log(`Storing test results in: ${testResultsDir}`);

// Log the base URL being used for tests
const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
console.log(`Using test base URL: ${baseUrl}`);

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
    screenshot: 'only-on-failure',
    video: 'on-first-retry',

    // Set custom paths for artifacts
    screenshotPath: screenshotsDir,
    videoPath: videosDir,
    tracesPath: tracesDir,
  },

  // Screenshots for snapshots and visual regression tests
  snapshotPathTemplate: path.join(testResultsDir, '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}'),

  // Store artifacts in the date-specific folder
  outputDir: testResultsDir,

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

  // Only start a web server when testing locally, not against remote URLs
  webServer: baseUrl.includes('localhost') ? {
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
