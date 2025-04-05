#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const organizeScreenshots = require('./organize-screenshots');

/**
 * Analyze test results and provide a summary of test failures
 */
function analyzeTestResults() {
  console.log('\n=========================================');
  console.log('        TEST RESULTS ANALYSIS           ');
  console.log('=========================================\n');

  // First, organize all screenshots
  const { debugDir, failuresDir, visualDir, screenshotsDir } = organizeScreenshots();

  // Check if test-results directory exists
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    console.log('No test-results directory found. Run tests first.');
    return;
  }

  // Get all test directories
  const testDirs = fs.readdirSync(testResultsDir)
    .filter(dir => dir !== '.last-run.json' && fs.statSync(path.join(testResultsDir, dir)).isDirectory());

  console.log(`Found ${testDirs.length} test result directories\n`);

  // Sort test directories by name
  const failedTestDirs = testDirs.filter(dir => dir.includes('-retry'));
  const passedTestDirs = testDirs.filter(dir => !dir.includes('-retry'));

  console.log('FAILED TESTS:');
  console.log('-------------');

  // Organize failures by file
  const failuresByFile = {};

  if (failedTestDirs.length === 0) {
    console.log('All tests passed! 🎉');
  } else {
    failedTestDirs.forEach(dir => {
      // Extract test file and test name from directory name
      const match = dir.match(/^(.+?)-(.+?)-chromium/);
      if (match) {
        const [_, testFile, testNamePart] = match;

        if (!failuresByFile[testFile]) {
          failuresByFile[testFile] = [];
        }

        // Get screenshot if available to help with debugging
        const screenshotPath = path.join(testResultsDir, dir, 'test-failed-1.png');
        const hasScreenshot = fs.existsSync(screenshotPath);

        // Look for the organized version in the failures directory
        const organizedScreenshot = path.join(
          failuresDir,
          `${dir.split('-chromium')[0]}-test-failed-1.png`
        );
        const hasOrganizedScreenshot = fs.existsSync(organizedScreenshot);

        failuresByFile[testFile].push({
          name: testNamePart.replace(/-/g, ' '),
          dir,
          hasScreenshot,
          screenshotPath: hasScreenshot ? screenshotPath : null,
          organizedScreenshot: hasOrganizedScreenshot ? organizedScreenshot : null
        });
      }
    });

    // Print failures grouped by file
    Object.keys(failuresByFile).sort().forEach(file => {
      console.log(`\n${file}.spec.ts:`);
      failuresByFile[file].forEach(test => {
        console.log(`  - ${test.name}`);
        if (test.hasScreenshot) {
          console.log(`    Screenshot: ${test.screenshotPath}`);
          if (test.organizedScreenshot) {
            console.log(`    Organized: ${test.organizedScreenshot}`);
          }
        }
      });
    });
  }

  console.log('\n=========================================');

  // Analyze any screenshots we took for debugging
  const debugScreenshots = fs.readdirSync(debugDir)
    .filter(file => file.match(/\.(png|jpg)$/));

  if (debugScreenshots.length > 0) {
    console.log('\nDEBUG SCREENSHOTS:');
    console.log('-----------------');
    console.log(`Found ${debugScreenshots.length} debug screenshots in ${debugDir}`);
    debugScreenshots.slice(0, 10).forEach(screenshot => {
      console.log(`- ${screenshot}`);
    });
    if (debugScreenshots.length > 10) {
      console.log(`... and ${debugScreenshots.length - 10} more`);
    }
  }

  // Generate HTML report
  generateHtmlReport({
    failuresByFile,
    debugScreenshots,
    visualDir,
    screenshotsDir,
    passedCount: passedTestDirs.length,
    failedCount: failedTestDirs.length
  });

  // Print HTML report location
  console.log('\nHTML Reports:');
  console.log('-----------');
  console.log('1. Playwright Report:');
  console.log('   To view the Playwright HTML report, run:');
  console.log('   npx playwright show-report');
  console.log('\n2. Screenshots Report:');
  console.log(`   ${path.join(screenshotsDir, 'report.html')}`);
  console.log();
}

/**
 * Generate an HTML report with links to all screenshots
 */
function generateHtmlReport({ failuresByFile, debugScreenshots, visualDir, screenshotsDir, passedCount, failedCount }) {
  const reportPath = path.join(screenshotsDir, 'report.html');

  // Get visual screenshots
  const visualScreenshots = fs.existsSync(visualDir)
    ? fs.readdirSync(visualDir).filter(file => file.match(/\.(png|jpg)$/))
    : [];

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cook-Eat Test Results</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    h1 {
      color: #2c3e50;
    }
    h2 {
      color: #2980b9;
      margin-top: 40px;
    }
    h3 {
      color: #3498db;
      margin-top: 25px;
    }
    .summary {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }
    .stat {
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
    }
    .passed {
      color: #27ae60;
    }
    .failed {
      color: #e74c3c;
    }
    .test-group {
      margin-bottom: 30px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    .test-name {
      font-weight: bold;
      color: #e74c3c;
    }
    .screenshots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .screenshot {
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 10px;
      background-color: white;
    }
    .screenshot img {
      max-width: 100%;
      height: auto;
      display: block;
      margin-bottom: 10px;
      border: 1px solid #eee;
    }
    .screenshot-title {
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
      margin-bottom: 20px;
    }
    .tab {
      padding: 10px 20px;
      cursor: pointer;
      background-color: #f1f1f1;
      margin-right: 5px;
      border-radius: 5px 5px 0 0;
    }
    .tab.active {
      background-color: #2980b9;
      color: white;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Cook-Eat Test Results</h1>
    <p>End-to-end test results and screenshots</p>
  </div>

  <div class="summary">
    <div class="stat">
      <div class="stat-value passed">${passedCount}</div>
      <div>Tests Passed</div>
    </div>
    <div class="stat">
      <div class="stat-value failed">${failedCount}</div>
      <div>Tests Failed</div>
    </div>
    <div class="stat">
      <div class="stat-value">${debugScreenshots.length}</div>
      <div>Debug Screenshots</div>
    </div>
    <div class="stat">
      <div class="stat-value">${visualScreenshots.length}</div>
      <div>Visual Tests</div>
    </div>
  </div>

  <div class="tabs">
    <div class="tab active" onclick="openTab(event, 'failures')">Failed Tests</div>
    <div class="tab" onclick="openTab(event, 'debug')">Debug Screenshots</div>
    <div class="tab" onclick="openTab(event, 'visual')">Visual Tests</div>
  </div>

  <div id="failures" class="tab-content active">
    <h2>Failed Tests</h2>
    ${failedCount === 0 ? '<p>All tests passed! 🎉</p>' : ''}
`;

  // Add failed tests
  Object.keys(failuresByFile).sort().forEach(file => {
    html += `
    <div class="test-group">
      <h3>${file}.spec.ts</h3>
      <ul>
    `;

    failuresByFile[file].forEach(test => {
      html += `<li class="test-name">${test.name}</li>`;
    });

    html += `</ul>`;

    // Add screenshots for this file
    html += `<div class="screenshots">`;
    failuresByFile[file].forEach(test => {
      if (test.organizedScreenshot) {
        const relativePath = path.relative(screenshotsDir, test.organizedScreenshot);
        html += `
        <div class="screenshot">
          <img src="${relativePath}" alt="${test.name}" />
          <div class="screenshot-title">${test.name}</div>
        </div>
        `;
      }
    });
    html += `</div></div>`;
  });

  // Add debug screenshots tab
  html += `
  </div>

  <div id="debug" class="tab-content">
    <h2>Debug Screenshots</h2>
    <div class="screenshots">
  `;

  debugScreenshots.forEach(screenshot => {
    html += `
    <div class="screenshot">
      <img src="debug/${screenshot}" alt="${screenshot}" />
      <div class="screenshot-title">${screenshot}</div>
    </div>
    `;
  });

  html += `
    </div>
  </div>

  <div id="visual" class="tab-content">
    <h2>Visual Tests</h2>
    <div class="screenshots">
  `;

  // Add visual test screenshots
  visualScreenshots.forEach(screenshot => {
    html += `
    <div class="screenshot">
      <img src="visual/${screenshot}" alt="${screenshot}" />
      <div class="screenshot-title">${screenshot}</div>
    </div>
    `;
  });

  html += `
    </div>
  </div>

  <script>
  function openTab(evt, tabName) {
    const tabs = document.getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].className = tabs[i].className.replace(' active', '');
    }

    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
      tabContents[i].className = tabContents[i].className.replace(' active', '');
    }

    document.getElementById(tabName).className += ' active';
    evt.currentTarget.className += ' active';
  }
  </script>
</body>
</html>
  `;

  fs.writeFileSync(reportPath, html);
  console.log(`\nGenerated HTML report at: ${reportPath}`);
}

// Run the analysis
if (require.main === module) {
  analyzeTestResults();
}

module.exports = analyzeTestResults;
