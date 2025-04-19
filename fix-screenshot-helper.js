/**
 * Script to fix ScreenshotHelper constructor calls in e2e tests
 * Run with: node fix-screenshot-helper.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper function to fix a file
function fixFile(filePath) {
  console.log(`Processing ${filePath}...`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Match pattern for incorrect ScreenshotHelper constructor calls
  const pattern = /new ScreenshotHelper\(([^,]+), ['"]([^'"]+)['"], ['"]([^'"]+)['"], ['"].*?['"], ([^)]+)\)/g;

  // Replace with correct format
  content = content.replace(pattern, 'new ScreenshotHelper($1, $4, \'$3\')');

  // Also fix any cases where category was omitted
  const simplePattern = /new ScreenshotHelper\(([^,]+), ([^)]+)\)/g;
  content = content.replace(simplePattern, (match, page, testTag) => {
    // If testTag doesn't have quotes, it's likely a variable, so keep as is
    if (!testTag.includes("'") && !testTag.includes('"')) {
      // Try to determine the category from context, default to 'general'
      const fileBaseName = path.basename(filePath, '.ts');
      let category = 'general';

      if (fileBaseName.includes('auth')) category = 'auth';
      else if (fileBaseName.includes('calendar')) category = 'calendar';
      else if (fileBaseName.includes('recipe')) category = 'recipes';
      else if (fileBaseName.includes('home')) category = 'home';
      else if (fileBaseName.includes('comment')) category = 'comments';

      return `new ScreenshotHelper(${page}, ${testTag}, '${category}')`;
    }
    return match;
  });

  // Fix private testTag access with getTestTag()
  content = content.replace(/screenshots\.testTag/g, 'testTag');

  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${filePath}`);
}

// Find all e2e test files
const e2eDir = path.join(__dirname, 'e2e');
const testFiles = execSync(`find ${e2eDir} -name "*.spec.ts" -o -name "test-utils.ts"`, { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

// Process each file
let fixedCount = 0;
testFiles.forEach(file => {
  try {
    fixFile(file);
    fixedCount++;
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
});

console.log(`Fixed ${fixedCount} files`);
