import { FullConfig } from '@playwright/test';
import { cleanupTestDatabase } from './setup/test-database';
import fs from 'fs';
import path from 'path';

/**
 * Global teardown function for Playwright tests
 * This runs once after all tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('Running global teardown...');

  // Clean up test database
  await cleanupTestDatabase();

  // Remove authentication state file if it exists
  const authStatePath = path.join(__dirname, 'setup/auth-state.json');
  if (fs.existsSync(authStatePath)) {
    fs.unlinkSync(authStatePath);
  }

  console.log('Global teardown complete');
}

export default globalTeardown;
