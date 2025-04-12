#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

// Setup test results directory
require('./setup-test-results-dir.js');

// Get command line arguments
const args = process.argv.slice(2);

// Default to quiet mode but allow override
const quietMode = process.env.E2E_QUIET_MODE !== 'false';

// Set up environment variables
const env = {
  ...process.env,
  E2E_QUIET_MODE: quietMode ? 'true' : 'false',
  PLAYWRIGHT_SCREENSHOTS: 'on',
  TEST_BASE_URL: 'https://cook-eat-preview.vercel.app',
  // This skips any Jest tests by setting a Jest worker ID
  JEST_WORKER_ID: 'playwright-only'
};

// Construct the command
let command = 'npx';
let commandArgs = ['playwright', 'test'];

// Add all passed arguments
if (args.length > 0) {
  commandArgs = [...commandArgs, ...args];
} else {
  // Default to running all E2E tests in chromium if no args provided
  commandArgs.push('--project=chromium');
}

console.log(`Using test base URL: https://cook-eat-preview.vercel.app`);
console.log(`Using preview database: YES`);
console.log(`Quiet mode: ${quietMode ? 'YES' : 'NO'}`);
console.log(`Screenshots enabled: ${env.PLAYWRIGHT_SCREENSHOTS === 'on' ? 'YES' : 'NO'}`);
console.log(`Video recording enabled: ${env.PLAYWRIGHT_VIDEO === 'on' ? 'YES' : 'NO'}`);
console.log(`Starting local web server: NO`);

// Run the command
const result = spawnSync(command, commandArgs, {
  stdio: 'inherit',
  env
});

// Exit with the same code as the process
process.exit(result.status);
