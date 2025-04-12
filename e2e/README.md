# E2E Testing Strategy

## Overview

This directory contains end-to-end (e2e) tests for the Cook Eat application. E2E tests verify the entire application flow from the user's perspective, ensuring all components work together correctly.

## Testing Approach

We've transitioned from a mock-based testing approach to using real components and API endpoints. This provides several benefits:

1. **More realistic tests**: Tests now match real user behavior and verify the actual functionality
2. **Lower maintenance**: No need to maintain mocks that mirror actual component behavior
3. **Higher confidence**: Tests pass only when the real system works correctly
4. **Early bug detection**: Integration issues are discovered earlier in development

## Test Database

The tests use a dedicated test database with pre-seeded data. This ensures tests are repeatable and don't interfere with development data.

- The test database is configured in `e2e/setup/test-database.ts`
- Test data includes a test user and test recipes with consistent IDs
- Run `npm run setup-test-db` to reset the test database before running tests

## Authentication

Tests requiring authentication use the `loginAsTestUser` helper function from `e2e/utils/test-utils.ts`. This logs in with a test user account that has the following credentials:

- Email: `test_e2e_test@example.com`
- Password: `password12345`

## Running Tests

To run the e2e tests:

```bash
# Setup the test database (needed once or after schema changes)
npm run setup-test-db

# Run all e2e tests
npm run test:e2e

# Run a specific test file
npm run test:e2e -- e2e/recipe-comments.spec.ts

# Run with UI mode (to see test execution)
npm run test:e2e -- --ui
```

## Screenshot Helper

The `ScreenshotHelper` class simplifies taking screenshots during tests. It captures:

- Full page screenshots
- Element screenshots
- Before/after action screenshots

Screenshots are saved to the test results directory and are included in the HTML report.

## Test Structure

Each test follows this pattern:

1. **Setup**: Navigate to the relevant page and authenticate if needed
2. **Verification**: Check that required elements are present and visible
3. **Interaction**: Perform actions like clicking buttons or filling forms
4. **Assertion**: Verify the expected outcome of those actions

## Best Practices

When writing e2e tests:

1. **Use real components**: Avoid mocking components or API endpoints
2. **Handle failures gracefully**: Skip tests if prerequisites aren't met
3. **Document test data requirements**: List what data must exist for tests to pass
4. **Keep tests independent**: Each test should work in isolation
5. **Use screenshots**: Capture state before and after important actions

## Troubleshooting

If tests are failing:

1. Check that the test database is properly set up
2. Verify the test user exists and can log in
3. Look at screenshots to see what the UI looked like during failures
4. Check if component selectors have changed
