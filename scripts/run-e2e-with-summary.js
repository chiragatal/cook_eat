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
};

// Construct the command - force running within the e2e folder
let testFiles = args.length > 0 ? args.map(arg => {
  // If it's not a project flag or other option, prefix with e2e/ if needed
  if (!arg.startsWith('--') && !arg.startsWith('e2e/')) {
    return `e2e/${arg}`;
  }
  return arg;
}) : ['e2e'];

// Default to chromium project if not specified
if (!args.some(arg => arg.includes('--project'))) {
  testFiles.push('--project=chromium');
}

// We need to run the command directly with npx
console.log(`Using test base URL: https://cook-eat-preview.vercel.app`);
console.log(`Using preview database: YES`);
console.log(`Quiet mode: ${quietMode ? 'YES' : 'NO'}`);
console.log(`Screenshots enabled: ${env.PLAYWRIGHT_SCREENSHOTS === 'on' ? 'YES' : 'NO'}`);
console.log(`Running command: npx playwright test ${testFiles.join(' ')}`);

// Run the command
const result = spawnSync('npx', ['playwright', 'test', ...testFiles], {
  stdio: 'inherit',
  env
});

if (result.status === 0) {
  // Tests passed, show summary
  console.log('\nGenerating screenshot summary:');
  spawnSync('node', [path.join(__dirname, 'summarize-screenshots.js')], {
    stdio: 'inherit'
  });
} else {
  console.error(`\nTests failed with exit code ${result.status}`);
}

// Exit with the same code as the process
process.exit(result.status);
