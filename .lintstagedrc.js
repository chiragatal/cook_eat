module.exports = {
  // Run ESLint on JS/TS files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    // Only run tests for staged files
    filenames => filenames.length > 0 ?
      `jest --findRelatedTests ${filenames.join(' ')}` :
      'echo "No files to test"'
  ],

  // Format various file types with prettier
  '*.{json,md,css,scss,html}': ['prettier --write']
};
