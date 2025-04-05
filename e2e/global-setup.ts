import { chromium, FullConfig } from '@playwright/test';
import { setupTestDatabase } from './setup/test-database';
import * as dotenv from 'dotenv';

// Load environment variables from .env.test if available
dotenv.config({ path: '.env.test' });

// Test prefix matches what's in test-database.ts
const TEST_PREFIX = 'test_e2e_';

/**
 * Global setup for Playwright tests
 * This runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('Running global setup...');

  // Set up test database
  await setupTestDatabase();

  // Create a browser context for authenticated state
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the signin page
    console.log('Navigating to the signin page...');
    await page.goto(`${config.projects[0].use.baseURL}/auth/signin`);

    // Log current URL to debug
    console.log(`Current URL: ${page.url()}`);

    // Take a screenshot for debugging
    await page.screenshot({ path: './signin-page-screenshot.png' });
    console.log('Saved signin page screenshot to signin-page-screenshot.png');

    // Inspect what's on the page
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    // Check if we're on a 404 page
    const is404 = await page.getByText('404: This page could not be found.').isVisible();
    if (is404) {
      console.log('WARNING: Signin page returned 404. The auth route may not exist.');

      // Despite login issues, we can still continue with tests that don't require auth
      console.log('Creating an empty auth state file...');
      const emptyAuthState = { cookies: [], origins: [] };
      const fs = require('fs');
      const path = require('path');

      // Create the auth state directory if it doesn't exist
      const authPath = path.join(__dirname, 'setup');
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
      }

      fs.writeFileSync(
        path.join(authPath, 'auth-state.json'),
        JSON.stringify(emptyAuthState)
      );

      console.log('Empty auth state created. Tests requiring authentication may fail.');
    } else {
      // If signin page exists, try to authenticate
      console.log('Signin page found, attempting to authenticate...');

      // Debug available input fields
      const inputFields = await page.locator('input').all();
      console.log(`Found ${inputFields.length} input fields`);

      for (let i = 0; i < inputFields.length; i++) {
        const inputField = inputFields[i];
        const type = await inputField.getAttribute('type');
        const name = await inputField.getAttribute('name');
        const id = await inputField.getAttribute('id');
        console.log(`Input #${i+1}: type=${type}, name=${name}, id=${id}`);
      }

      // Use more flexible selectors to find email and password fields
      const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"], input[id*="password" i]').first();
      const signinButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();

      if (await emailInput.isVisible() && await passwordInput.isVisible() && await signinButton.isVisible()) {
        console.log('Found form fields, filling signin form...');

        // Fill signin form
        await emailInput.fill(`${TEST_PREFIX}test@example.com`);
        await passwordInput.fill('password12345');
        await signinButton.click();

        // Wait for navigation
        console.log('Waiting for navigation after signin...');
        await page.waitForURL('**/*', { timeout: 10000 }).catch(e => {
          console.log('Navigation timeout after signin, but continuing...');
        });

        // Store authentication state
        console.log('Storing authentication state...');
        await page.context().storageState({ path: './e2e/setup/auth-state.json' });
        console.log('Authentication state stored.');
      } else {
        console.log('WARNING: Could not find all signin form elements');
        console.log('Creating an empty auth state file...');

        const emptyAuthState = { cookies: [], origins: [] };
        const fs = require('fs');
        const path = require('path');

        // Create the auth state directory if it doesn't exist
        const authPath = path.join(__dirname, 'setup');
        if (!fs.existsSync(authPath)) {
          fs.mkdirSync(authPath, { recursive: true });
        }

        fs.writeFileSync(
          path.join(authPath, 'auth-state.json'),
          JSON.stringify(emptyAuthState)
        );
      }
    }
  } catch (error) {
    console.error('Error in global setup:', error);

    // Create empty auth state in case of error
    const emptyAuthState = { cookies: [], origins: [] };
    const fs = require('fs');
    const path = require('path');

    // Create the auth state directory if it doesn't exist
    const authPath = path.join(__dirname, 'setup');
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(authPath, 'auth-state.json'),
      JSON.stringify(emptyAuthState)
    );

    console.log('Empty auth state created due to error. Tests requiring authentication may fail.');
  } finally {
    // Close the browser
    await browser.close();
    console.log('Global setup complete');
  }
}

export default globalSetup;
