#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const organizeScreenshots = require('./organize-screenshots');

// ANSI color codes for better readability
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Analyze test results and provide a summary of test failures
 */
function analyzeTestResults() {
  try {
    console.log(`\n${colors.magenta}${colors.bold}=== TEST RESULTS ANALYSIS ===${colors.reset}\n`);

    // Find the latest test results
    const latestDir = findLatestTestResults();
    const dirName = path.basename(latestDir);
    console.log(`${colors.cyan}Analyzing test results from: ${colors.bold}${dirName}${colors.reset}\n`);

    // Calculate timestamp from directory name
    let timestamp = "Unknown";
    try {
      const dateStr = dirName.replace(/-/g, ':').replace('T', ' ');
      timestamp = new Date(dateStr).toLocaleString();
    } catch (e) {
      // If there's an error parsing the date, just use the directory name
    }
    console.log(`${colors.cyan}Test run timestamp: ${timestamp}${colors.reset}\n`);

    // Count screenshots in the artifacts directory
    const artifactsDir = path.join(latestDir, 'artifacts');
    const screenshotsDir = path.join(artifactsDir, 'screenshots');
    const failuresDir = path.join(screenshotsDir, 'failures');
    const debugDir = path.join(screenshotsDir, 'debug');

    let screenshotCount = 0;
    let failureScreenshotCount = 0;
    let debugScreenshotCount = 0;

    if (fs.existsSync(screenshotsDir)) {
      const countFiles = (dir) => {
        if (!fs.existsSync(dir)) return 0;
        let count = 0;

        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
              count += countFiles(fullPath);
            } else if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
              count++;
            }
          }
        } catch (error) {
          console.warn(`${colors.yellow}Warning: Error counting files in ${dir}: ${error.message}${colors.reset}`);
        }

        return count;
      };

      screenshotCount = countFiles(screenshotsDir);
      failureScreenshotCount = countFiles(failuresDir);
      debugScreenshotCount = countFiles(debugDir);

      console.log(`${colors.yellow}Screenshots captured:${colors.reset}`);
      console.log(`  Total: ${screenshotCount}`);
      if (failureScreenshotCount > 0) {
        console.log(`  Failures: ${colors.red}${failureScreenshotCount}${colors.reset}`);
      } else {
        console.log(`  Failures: ${colors.green}0${colors.reset}`);
      }
      console.log(`  Debug: ${debugScreenshotCount}\n`);
    } else {
      console.log(`${colors.yellow}No screenshots found${colors.reset}\n`);
    }

    // Count videos in the artifacts directory
    const videosDir = path.join(artifactsDir, 'videos');
    let videoCount = 0;

    if (fs.existsSync(videosDir)) {
      const countVideos = (dir) => {
        let count = 0;

        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
              count += countVideos(fullPath);
            } else if (file.endsWith('.mp4') || file.endsWith('.webm')) {
              count++;
            }
          }
        } catch (error) {
          console.warn(`${colors.yellow}Warning: Error counting videos in ${dir}: ${error.message}${colors.reset}`);
        }

        return count;
      };

      videoCount = countVideos(videosDir);
      console.log(`${colors.yellow}Videos captured: ${videoCount}${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}No videos found${colors.reset}\n`);
    }

    // Check for HTML report
    const reportPath = path.join(latestDir, 'html-report', 'index.html');
    if (fs.existsSync(reportPath)) {
      console.log(`${colors.green}HTML report available at:${colors.reset}`);
      console.log(`${reportPath}\n`);

      // Try to get test summary from the report
      try {
        // Parse the HTML report to extract test summary
        const reportHtml = fs.readFileSync(reportPath, 'utf8');

        // Very basic regex-based extraction - might need improvement for complex reports
        const passedMatch = reportHtml.match(/(\d+)\s*passed/i);
        const failedMatch = reportHtml.match(/(\d+)\s*failed/i);
        const skippedMatch = reportHtml.match(/(\d+)\s*skipped/i);

        if (passedMatch || failedMatch) {
          console.log(`${colors.yellow}Test Summary:${colors.reset}`);
          const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
          const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
          const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
          const total = passed + failed + skipped;

          console.log(`  Total: ${total}`);
          console.log(`  Passed: ${colors.green}${passed}${colors.reset}`);
          if (failed > 0) {
            console.log(`  Failed: ${colors.red}${failed}${colors.reset}`);
          } else {
            console.log(`  Failed: ${colors.green}0${colors.reset}`);
          }
          if (skipped > 0) {
            console.log(`  Skipped: ${colors.yellow}${skipped}${colors.reset}`);
          } else {
            console.log(`  Skipped: 0`);
          }
        }
      } catch (e) {
        console.log(`${colors.yellow}Could not extract test summary from report${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}No HTML report found${colors.reset}\n`);
    }

    // Create a summary file
    const summaryPath = path.join(latestDir, 'summary.txt');
    try {
      const summary = `TEST RESULTS SUMMARY
Test run: ${timestamp}
Directory: ${dirName}

Screenshots: ${screenshotCount} total, ${failureScreenshotCount} failures
Videos: ${videoCount}

View the full HTML report in the 'html-report' directory.
View artifacts in the 'artifacts' directory.
`;
      fs.writeFileSync(summaryPath, summary);
      console.log(`${colors.green}Summary saved to:${colors.reset}`);
      console.log(`${summaryPath}\n`);
    } catch (e) {
      console.log(`${colors.yellow}Could not create summary file: ${e.message}${colors.reset}\n`);
    }

    // Offer to open the report
    console.log(`${colors.magenta}To view the full test report, run:${colors.reset}`);
    console.log(`npm run test:view-latest\n`);

    console.log(`${colors.magenta}To view the screenshots, run:${colors.reset}`);
    console.log(`npm run test:view-screenshots\n`);

    return latestDir;

  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Helper to find the latest test results directory
function findLatestTestResults() {
  const testResultsBaseDir = path.join(__dirname, '..', 'test-results');

  // Check if the test-results directory exists
  if (!fs.existsSync(testResultsBaseDir)) {
    throw new Error('Test results directory not found. Please run tests first.');
  }

  // Check if latest symlink exists
  const latestSymlinkPath = path.join(testResultsBaseDir, 'latest');
  if (fs.existsSync(latestSymlinkPath)) {
    try {
      const latestTarget = fs.readlinkSync(latestSymlinkPath);
      return path.join(testResultsBaseDir, latestTarget);
    } catch (error) {
      console.warn(`${colors.yellow}Warning: Could not read latest symlink. Finding latest directory by date instead.${colors.reset}`);
    }
  }

  // Find latest directory by date
  try {
    const dirs = fs.readdirSync(testResultsBaseDir)
      .filter(name => name !== 'latest' && fs.statSync(path.join(testResultsBaseDir, name)).isDirectory())
      .map(name => ({ name, time: fs.statSync(path.join(testResultsBaseDir, name)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (dirs.length === 0) {
      throw new Error('No test results directories found');
    }

    return path.join(testResultsBaseDir, dirs[0].name);
  } catch (error) {
    throw new Error(`Failed to find latest test results directory: ${error.message}`);
  }
}

// Run the analysis
if (require.main === module) {
  analyzeTestResults();
}

module.exports = analyzeTestResults;
