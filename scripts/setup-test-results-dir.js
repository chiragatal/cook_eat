#!/usr/bin/env node

/**
 * This script creates a date-specific directory structure for test results
 * and sets up symlinks for the latest test results.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for better readability
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

// Main function to set up the test results directory
function setupTestResultsDir() {
  console.log(`\n${colors.magenta}=== SETTING UP TEST RESULTS DIRECTORY ===${colors.reset}\n`);

  try {
    // Create a date-stamped folder name
    const currentDate = new Date();
    const dateString = currentDate.toISOString().replace(/:/g, '-').replace(/\..+/, '');

    // Define all the necessary directories
    const testResultsBaseDir = path.join(__dirname, '..', 'test-results');
    const testResultsDir = path.join(testResultsBaseDir, dateString);
    const subDirs = [
      'screenshots',
      'screenshots/debug',
      'screenshots/failures',
      'reports',
      'videos',
      'traces'
    ];

    // Create the base directory if it doesn't exist
    if (!fs.existsSync(testResultsBaseDir)) {
      fs.mkdirSync(testResultsBaseDir, { recursive: true });
      console.log(`${colors.green}✓ Created base test results directory${colors.reset}`);
    }

    // Create the date-specific directory
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
      console.log(`${colors.green}✓ Created test results directory for ${dateString}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Test results directory for ${dateString} already exists${colors.reset}`);
    }

    // Create all the subdirectories
    for (const subDir of subDirs) {
      const fullPath = path.join(testResultsDir, subDir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`${colors.green}✓ Created ${subDir} directory${colors.reset}`);
      }
    }

    // Create/update the 'latest' symlink
    const latestSymlinkPath = path.join(testResultsBaseDir, 'latest');

    // Remove existing symlink if it exists
    if (fs.existsSync(latestSymlinkPath)) {
      try {
        fs.unlinkSync(latestSymlinkPath);
        console.log(`${colors.green}✓ Removed old 'latest' symlink${colors.reset}`);
      } catch (error) {
        console.log(`${colors.yellow}Warning: Could not remove existing 'latest' symlink: ${error.message}${colors.reset}`);
      }
    }

    // Create new symlink
    try {
      fs.symlinkSync(dateString, latestSymlinkPath, 'dir');
      console.log(`${colors.green}✓ Created 'latest' symlink to ${dateString}${colors.reset}`);
    } catch (error) {
      console.log(`${colors.yellow}Warning: Could not create 'latest' symlink: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}You may need to run this script with administrator privileges on Windows${colors.reset}`);
    }

    // Create a README file in the test results directory
    const readmePath = path.join(testResultsDir, 'README.md');
    const readmeContent = `# Test Results - ${dateString}

This directory contains the test results from a test run on ${currentDate.toLocaleString()}.

## Directory Structure

- \`screenshots/\` - Screenshots captured during test runs
  - \`debug/\` - Debug screenshots
  - \`failures/\` - Screenshots captured on test failures
- \`reports/\` - HTML test reports
- \`videos/\` - Video recordings of test runs
- \`traces/\` - Trace files for debugging

## Viewing Test Results

To view the HTML report, open the following file in your browser:
\`reports/index.html\`

Or run:
\`npm run test:view-latest\`
`;

    fs.writeFileSync(readmePath, readmeContent);
    console.log(`${colors.green}✓ Created README file${colors.reset}`);

    console.log(`\n${colors.cyan}Test results directory setup complete${colors.reset}`);
    console.log(`${colors.cyan}Test results will be stored in: ${testResultsDir}${colors.reset}`);
    console.log(`${colors.cyan}Access the latest test results with the 'latest' symlink${colors.reset}`);

    return {
      testResultsDir,
      dateString
    };

  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  setupTestResultsDir();
}

module.exports = setupTestResultsDir;
