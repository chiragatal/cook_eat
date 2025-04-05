#!/usr/bin/env node

/**
 * This script verifies the test environment setup
 * and checks that all directories are created correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for better readability
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function verifyTestEnvironment() {
  console.log(`\n${colors.magenta}=== VERIFYING TEST ENVIRONMENT SETUP ===${colors.reset}\n`);

  try {
    // Check base directories
    const testResultsBaseDir = path.join(__dirname, '..', 'test-results');

    if (!fs.existsSync(testResultsBaseDir)) {
      console.log(`${colors.red}❌ Test results base directory does not exist: ${testResultsBaseDir}${colors.reset}`);
      fs.mkdirSync(testResultsBaseDir, { recursive: true });
      console.log(`${colors.green}✓ Created test results base directory${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Test results base directory exists: ${testResultsBaseDir}${colors.reset}`);
    }

    // Check latest symlink
    const latestSymlinkPath = path.join(testResultsBaseDir, 'latest');
    if (!fs.existsSync(latestSymlinkPath)) {
      console.log(`${colors.yellow}⚠️ 'latest' symlink does not exist${colors.reset}`);
      console.log(`${colors.cyan}ℹ️ This is normal if no tests have been run yet${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ 'latest' directory exists${colors.reset}`);

      // Check if it's actually a directory (not a symlink)
      const isSymlink = fs.lstatSync(latestSymlinkPath).isSymbolicLink();
      if (isSymlink) {
        try {
          // Get the target of the symlink
          const symlinkTarget = fs.readlinkSync(latestSymlinkPath);
          console.log(`${colors.cyan}ℹ️ 'latest' symlink points to: ${symlinkTarget}${colors.reset}`);

          // Check if the target directory exists
          const targetDir = path.join(testResultsBaseDir, symlinkTarget);
          if (fs.existsSync(targetDir)) {
            console.log(`${colors.green}✓ Symlink target directory exists${colors.reset}`);
          } else {
            console.log(`${colors.red}❌ Symlink target directory does not exist: ${targetDir}${colors.reset}`);
          }
        } catch (error) {
          console.log(`${colors.red}❌ Error reading symlink: ${error.message}${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}⚠️ 'latest' is a directory, not a symlink${colors.reset}`);
        console.log(`${colors.cyan}ℹ️ This is fine, but symlinks are used to maintain dated results${colors.reset}`);
      }

      // Check latest subdirectories, regardless of whether it's a symlink or not
      const expectedSubDirs = [
        'html-report',
        'artifacts'
      ];

      for (const subDir of expectedSubDirs) {
        const subDirPath = path.join(latestSymlinkPath, subDir);
        if (fs.existsSync(subDirPath)) {
          console.log(`${colors.green}✓ Subdirectory exists: ${subDir}${colors.reset}`);
        } else {
          console.log(`${colors.red}❌ Subdirectory missing: ${subDir}${colors.reset}`);
        }
      }

      // Check the test-specific artifact directories
      const artifactsDir = path.join(latestSymlinkPath, 'artifacts');
      if (fs.existsSync(artifactsDir)) {
        const artifactItems = fs.readdirSync(artifactsDir, { withFileTypes: true });
        const testDirs = artifactItems.filter(item => item.isDirectory() &&
          !['screenshots', 'videos', 'traces'].includes(item.name));

        console.log(`${colors.cyan}ℹ️ Found ${testDirs.length} test-specific directories${colors.reset}`);

        // Check for screenshots in test directories
        let totalScreenshots = 0;
        for (const testDir of testDirs) {
          const testDirPath = path.join(artifactsDir, testDir.name);
          const files = fs.readdirSync(testDirPath, { withFileTypes: true });
          const screenshots = files.filter(file => file.isFile() &&
              (file.name.endsWith('.png') || file.name.endsWith('.jpg')));

          totalScreenshots += screenshots.length;

          if (screenshots.length > 0) {
            console.log(`${colors.green}✓ Found ${screenshots.length} screenshots in ${testDir.name}${colors.reset}`);
          } else {
            console.log(`${colors.yellow}⚠️ No screenshots found in ${testDir.name}${colors.reset}`);
          }
        }

        if (totalScreenshots > 0) {
          console.log(`${colors.green}✓ Found ${totalScreenshots} total screenshots across all directories${colors.reset}`);
        } else {
          console.log(`${colors.red}❌ No screenshots found in any directory${colors.reset}`);
        }
      }
    }

    // Check if Playwright is installed
    try {
      const playwrightVersion = execSync('npx playwright -V', { encoding: 'utf8' }).trim();
      console.log(`${colors.green}✓ Playwright is installed: ${playwrightVersion}${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Playwright is not installed or not in PATH${colors.reset}`);
    }

    // Check package.json scripts
    try {
      const packageJson = require(path.join(__dirname, '..', 'package.json'));
      const scripts = packageJson.scripts || {};

      const requiredScripts = [
        'test:e2e',
        'test:view-latest',
        'test:view-screenshots'
      ];

      for (const script of requiredScripts) {
        if (scripts[script]) {
          console.log(`${colors.green}✓ Script exists in package.json: ${script}${colors.reset}`);
        } else {
          console.log(`${colors.red}❌ Script missing from package.json: ${script}${colors.reset}`);
        }
      }

      // Check cross-env dependency
      const devDependencies = packageJson.devDependencies || {};
      if (devDependencies['cross-env']) {
        console.log(`${colors.green}✓ cross-env dependency exists: ${devDependencies['cross-env']}${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ cross-env dependency missing${colors.reset}`);
        console.log(`${colors.cyan}ℹ️ Install with: npm install cross-env --save-dev${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error checking package.json: ${error.message}${colors.reset}`);
    }

    console.log(`\n${colors.cyan}Test environment verification complete${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    return false;
  }

  return true;
}

// If this script is run directly
if (require.main === module) {
  const success = verifyTestEnvironment();
  process.exit(success ? 0 : 1);
}

module.exports = verifyTestEnvironment;
