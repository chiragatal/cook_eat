module.exports = {
  // Run ESLint on JS/TS files
  '*.{js,jsx,ts,tsx}': ['eslint --fix'],

  // Format various file types with prettier
  '*.{json,md,css,scss,html}': ['prettier --write'],

  // Run TypeScript check on TS files
  '*.{ts,tsx}': () => 'tsc --noEmit',
};
