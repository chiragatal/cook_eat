#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Summarize screenshots taken during a test run
 * This provides a more concise report of screenshots instead of logging each one
 */
function summarizeScreenshots() {
  // Get the path to the latest test results directory
  const testResultsDir = path.join(process.cwd(), 'test-results');
  const latestDir = path.join(testResultsDir, 'latest');

  // Check if the directory exists
  if (!fs.existsSync(latestDir)) {
    console.log('No test results found in test-results/latest');
    return;
  }

  // Try different possible screenshot directories
  const possibleDirs = [
    path.join(latestDir, 'artifacts', 'screenshots'),
    path.join(latestDir, 'screenshots'),
    path.join(testResultsDir, 'screenshots'),
  ];

  let screenshotsDir = null;
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      screenshotsDir = dir;
      break;
    }
  }

  if (!screenshotsDir) {
    console.log('No screenshots directory found. Checked:');
    possibleDirs.forEach(dir => console.log(`- ${dir}`));
    return;
  }

  console.log(`Using screenshots directory: ${screenshotsDir}`);

  let totalCount = 0;
  const categoryCounts = {};
  const testCounts = {};

  // Function to count screenshots in a directory
  function countScreenshots(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        // Recursively count screenshots in subdirectories
        countScreenshots(itemPath);
      } else if (item.isFile() && item.name.endsWith('.png')) {
        totalCount++;

        // Extract category from path
        const relativePath = path.relative(screenshotsDir, dir);
        const category = relativePath || 'root';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;

        // Extract test name from filename
        const testName = item.name.split('-')[0];
        if (testName) {
          testCounts[testName] = (testCounts[testName] || 0) + 1;
        }
      }
    }
  }

  // Start counting
  countScreenshots(screenshotsDir);

  if (totalCount === 0) {
    console.log('No screenshots found in the directory.');
    return;
  }

  // Print summary
  console.log('\n📸 Screenshot Summary:');
  console.log(`Total screenshots: ${totalCount}`);

  if (Object.keys(categoryCounts).length > 0) {
    console.log('\nBy category:');
    Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });
  }

  if (Object.keys(testCounts).length > 0) {
    console.log('\nBy test:');
    Object.entries(testCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([test, count]) => {
        console.log(`  ${test}: ${count}`);
      });
  }

  console.log(`\nView all screenshots: npm run test:view-screenshots`);
}

// Run if script is executed directly
if (require.main === module) {
  summarizeScreenshots();
}

module.exports = summarizeScreenshots;
