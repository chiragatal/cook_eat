#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Organize all PNG screenshots into a central screenshots directory
 */
function organizeScreenshots() {
  console.log('\n=========================================');
  console.log('     ORGANIZING TEST SCREENSHOTS         ');
  console.log('=========================================\n');

  const rootDir = process.cwd();
  const screenshotsDir = path.join(rootDir, 'screenshots');

  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    console.log(`Created screenshots directory: ${screenshotsDir}`);
  }

  // Create subdirectories for different types of screenshots
  const debugDir = path.join(screenshotsDir, 'debug');
  const failuresDir = path.join(screenshotsDir, 'failures');
  const visualDir = path.join(screenshotsDir, 'visual');

  [debugDir, failuresDir, visualDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Find all PNG files in the root directory
  const rootPngFiles = findPngFiles(rootDir);
  console.log(`Found ${rootPngFiles.length} PNG files in root directory`);

  // Move root PNG files to debug directory
  let movedCount = 0;
  rootPngFiles.forEach(filePath => {
    // Skip files that are already in the screenshots directory
    if (filePath.startsWith(screenshotsDir)) {
      return;
    }

    const fileName = path.basename(filePath);
    const destPath = path.join(debugDir, fileName);

    try {
      fs.copyFileSync(filePath, destPath);
      fs.unlinkSync(filePath); // Remove original after copying
      movedCount++;
      console.log(`Moved: ${fileName}`);
    } catch (err) {
      console.error(`Error moving ${fileName}: ${err.message}`);
    }
  });

  console.log(`Moved ${movedCount} PNG files to ${debugDir}`);

  // Find and move test result screenshots
  if (fs.existsSync(path.join(rootDir, 'test-results'))) {
    const testResultsFiles = [];
    findScreenshotsInTestResults(path.join(rootDir, 'test-results'), testResultsFiles);

    console.log(`Found ${testResultsFiles.length} PNG files in test-results directory`);

    let testResultsMoved = 0;
    testResultsFiles.forEach(filePath => {
      // Extract test name from path for better organization
      const pathParts = filePath.split(path.sep);
      const testDirIndex = pathParts.findIndex(part => part === 'test-results');

      if (testDirIndex >= 0 && pathParts.length > testDirIndex + 1) {
        const testName = pathParts[testDirIndex + 1].split('-chromium')[0];
        const fileName = path.basename(filePath);
        const destFileName = `${testName}-${fileName}`;
        const destPath = path.join(failuresDir, destFileName);

        try {
          fs.copyFileSync(filePath, destPath);
          testResultsMoved++;
        } catch (err) {
          console.error(`Error copying ${fileName}: ${err.message}`);
        }
      }
    });

    console.log(`Copied ${testResultsMoved} test failure screenshots to ${failuresDir}`);
  }

  // Find and organize visual test screenshots
  const visualTestDir = path.join(rootDir, 'e2e', 'visual.spec.ts-snapshots');
  if (fs.existsSync(visualTestDir)) {
    const visualFiles = findPngFiles(visualTestDir);

    console.log(`Found ${visualFiles.length} PNG files in visual test snapshots directory`);

    let visualMoved = 0;
    visualFiles.forEach(filePath => {
      const fileName = path.basename(filePath);
      const destPath = path.join(visualDir, fileName);

      try {
        fs.copyFileSync(filePath, destPath);
        visualMoved++;
      } catch (err) {
        console.error(`Error copying ${fileName}: ${err.message}`);
      }
    });

    console.log(`Copied ${visualMoved} visual test screenshots to ${visualDir}`);
  }

  console.log('\n=========================================');
  console.log('  Screenshot organization complete!      ');
  console.log('=========================================\n');

  return {
    debugDir,
    failuresDir,
    visualDir,
    screenshotsDir
  };
}

/**
 * Find all PNG files in a directory (non-recursive)
 */
function findPngFiles(directory) {
  try {
    return fs.readdirSync(directory)
      .filter(file => file.toLowerCase().endsWith('.png'))
      .map(file => path.join(directory, file));
  } catch (err) {
    console.error(`Error reading directory ${directory}: ${err.message}`);
    return [];
  }
}

/**
 * Recursively find PNG files in test-results directory
 */
function findScreenshotsInTestResults(directory, results = []) {
  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        findScreenshotsInTestResults(fullPath, results);
      } else if (entry.name.toLowerCase().endsWith('.png')) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${directory}: ${err.message}`);
  }

  return results;
}

// Execute if this script is run directly
if (require.main === module) {
  organizeScreenshots();
}

module.exports = organizeScreenshots;
