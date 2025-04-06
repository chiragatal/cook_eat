# Testing Guide

This document explains how to run tests for this project.

## Unit Tests

We use Jest for unit testing React components and utility functions.

### Running Unit Tests

```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch
```

## End-to-End Tests

We use Playwright for end-to-end testing. The E2E tests are in the `e2e/` directory.

### Running E2E Tests

```bash
# RECOMMENDED: Run tests with reduced logging and summary
npm run test:e2e:simple

# Standard test run with default logging
npm run test:e2e

# Ultra-quiet mode with minimal output
npm run test:e2e:min
```

### Browser-Specific Tests

```bash
# Run on Chrome only
npm run test:e2e:chrome

# Run on Firefox only
npm run test:e2e:firefox

# Run on Safari only
npm run test:e2e:safari
```

### Debugging Tests

```bash
# UI mode for interactive debugging
npm run test:e2e:ui

# Step-by-step debugging
npm run test:e2e:debug
```

### Running Specific Tests

```bash
# Run a specific test file
npm run test:e2e:simple -- auth.spec.ts

# Run tests matching a specific name
npm run test:e2e:simple -- --grep "login page"
```

### Viewing Test Results

```bash
# View HTML report
npm run test:view-report

# View screenshots
npm run test:view-screenshots

# View screenshot summary
npm run test:e2e:view-summary
```

## Logging Verbosity Levels

We support three logging verbosity levels for E2E tests:

1. **Normal Mode** - Shows all logs and screenshots
2. **Quiet Mode** - Reduces screenshot logging to every 10th screenshot
3. **Ultra Quiet Mode** - Completely disables screenshot logging

Control these with:
- `.env.test`: `E2E_QUIET_MODE=true` or `E2E_ULTRA_QUIET_MODE=true`
- Command choice: `test:e2e` (normal), `test:e2e:simple` (quiet), `test:e2e:min` (ultra-quiet)

## Test Database

Tests run against a dedicated test database. The configuration is in `.env.test`.

If you want to run against the preview database:

```bash
npm run test:preview
```

## Screenshot Helper

Tests use a standardized `ScreenshotHelper` class found in `e2e/utils/screenshot-helper.ts`:

```typescript
// Create a screenshot helper
const screenshots = new ScreenshotHelper(page, 'test-name', 'category');

// Take a simple screenshot
await screenshots.take('page-loaded');

// Capture a specific element
await screenshots.captureElement('.login-form', 'login-form');

// Capture before/after an action
await screenshots.captureAction('click-button', async () => {
  await page.click('#submit');
});
```
