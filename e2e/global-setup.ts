import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { setupTestDatabase } from './setup/test-database';

// Load environment variables
if (fs.existsSync('.env.test')) {
  dotenv.config({ path: '.env.test' });
}

/**
 * Global setup for tests, including authentication
 */
async function globalSetup(config: FullConfig) {
  // Check if quiet mode is enabled
  const quietMode = process.env.E2E_QUIET_MODE === 'true';

  if (!quietMode) {
    console.log('Starting global setup...');
  }

  // Always use preview settings
  const usePreviewDatabase = true;

  if (!quietMode) {
    console.log('Using preview database: YES');
  } else {
    console.log('[Setup] Using preview database: YES');
  }

  // Set up test database
  try {
    await setupTestDatabase();
    if (!quietMode) {
      console.log('Test database setup completed');
    }
  } catch (error) {
    console.warn('Warning: Error during test database setup:', error);
    console.log('Continuing with tests, but database-dependent tests may fail');
  }

  // Create the auth state directory if it doesn't exist
  const authDir = path.join(__dirname, 'setup');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const authFile = path.join(authDir, 'auth-state.json');
  const baseURL = 'https://cook-eat-preview.vercel.app';

  if (!quietMode) {
    console.log(`Using base URL: ${baseURL}`);
  }

  // Always perform Vercel auth for preview URL
  if (!quietMode) {
    console.log('Preview URL testing configured. Will check for Vercel authentication.');
  }

  // Launch a browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ baseURL });

  try {
    if (!quietMode) {
      console.log('Navigating to base URL for authentication...');
    }
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // If we see the Vercel login page, need to authenticate
    if (await page.getByText('Log in to Vercel').isVisible()) {
      console.log('Detected Vercel login page, attempting to authenticate...');

      // Check if we have authentication credentials in environment variables
      const vercelEmail = process.env.VERCEL_EMAIL;
      const vercelPassword = process.env.VERCEL_PASSWORD;

      if (vercelEmail && vercelPassword) {
        // If the login with email option is available, click it
        if (await page.getByText('Continue with Email').isVisible()) {
          await page.getByText('Continue with Email').click();
          await page.waitForLoadState('networkidle');
        }

        // Enter email and password
        await page.getByPlaceholder('you@example.com').fill(vercelEmail);
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.waitForLoadState('networkidle');

        // Enter password if prompted
        if (await page.getByPlaceholder('Password').isVisible()) {
          await page.getByPlaceholder('Password').fill(vercelPassword);
          await page.getByRole('button', { name: 'Continue' }).click();
          await page.waitForLoadState('networkidle');
        }

        console.log('Logged in to Vercel successfully');
      } else {
        console.log('No Vercel credentials found in environment variables.');
        console.log('Please manually log in to proceed with tests.');

        // Wait for manual authentication (give time for user to log in)
        await page.waitForTimeout(60000); // Wait for 1 minute
      }

      // After login, we should be redirected to our actual application
      await page.waitForLoadState('networkidle');
    } else if (!quietMode) {
      console.log('Direct access to application (no Vercel login required)');
    }

    // Store the authentication state
    await page.context().storageState({ path: authFile });
    if (!quietMode) {
      console.log(`Authentication state saved to ${authFile}`);
    }

  } catch (error) {
    console.error('Error during authentication setup:', error);
  } finally {
    // Close the browser
    await browser.close();
    if (!quietMode) {
      console.log('Global setup completed.');
    }
  }
}

export default globalSetup;
