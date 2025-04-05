# Testing Cook-Eat

This document describes the testing strategy for the Cook-Eat application and provides instructions on how to run the tests.

## Testing Strategy

The Cook-Eat application uses a comprehensive testing approach:

1. **Unit tests** - Test individual components and functions in isolation
2. **End-to-end (E2E) tests** - Test the application as a whole, simulating user interactions
3. **Visual regression tests** - Ensure the UI doesn't unexpectedly change
4. **Mobile responsiveness tests** - Verify the application works well on mobile devices

## Test Tools

- **Jest** and **React Testing Library** for unit tests
- **Playwright** for E2E tests, visual regression tests, and mobile testing

## Running Tests

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database running (for E2E tests)
- Application environment variables set up (.env.local file)

### Unit Tests

Run unit tests with:

```bash
npm test
```

Run unit tests in watch mode (for development):

```bash
npm run test:watch
```

### End-to-End Tests

Run E2E tests with:

```bash
npm run test:e2e
```

Run E2E tests with UI mode (interactive):

```bash
npm run test:e2e:ui
```

### Run All Tests

Run both unit and E2E tests:

```bash
npm run test:all
```

## Pre-commit Hooks

The project uses Husky to run tests on staged files before committing. This helps ensure that only working code is committed to the repository.

## Writing New Tests

### Unit Tests

1. Create a new file in the `__tests__` directory
2. Follow the naming convention: `ComponentName.test.tsx`
3. Import the component and testing utilities
4. Write test cases using the Jest/React Testing Library API

Example:

```tsx
import { render, screen } from '@testing-library/react';
import MyComponent from '@/app/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### E2E Tests

1. Create a new file in the `e2e` directory
2. Follow the naming convention: `feature-name.spec.ts`
3. Import Playwright test utilities
4. Write test cases that simulate user interactions

Example:

```ts
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
});
```

## Best Practices

1. **Keep tests independent** - Each test should run in isolation
2. **Test behavior, not implementation** - Focus on what the user sees and does
3. **Mock external dependencies** - Use Jest mocks for APIs and services
4. **Use data-testid attributes** - Add `data-testid` to elements for more reliable selection
5. **Run tests before submitting PRs** - Make sure all tests pass locally before pushing

## Mobile Testing

For mobile-specific testing, use Playwright's device emulation:

```ts
test('works on mobile', async ({ page }) => {
  // Set viewport to mobile size
  await page.setViewportSize({ width: 375, height: 667 });

  // Your test steps here
  await page.goto('/');
  // etc.
});
```

## Database Isolation in E2E Tests

To ensure E2E tests don't affect production data or other users, we've implemented the following safeguards:

1. **Data Prefixing**: All test data uses a `test_e2e_` prefix to easily identify and isolate test data from real user data.

2. **Targeted Cleanup**: Tests only delete data that starts with the test prefix, ensuring they never affect real user data.

3. **Self-Contained Tests**: Each test suite creates and manages its own test data, with cleanup run before and after tests.

4. **Isolated Authentication**: Tests use their own test user accounts, never testing with real user credentials.

5. **Safe Search & Filtering**: Tests search for prefixed test data, avoiding accidental modification of real data.

### How It Works

1. Before running tests, our setup:
   - Removes any existing data with the test prefix
   - Creates fresh test users and data for testing

2. During tests:
   - All created data includes the test prefix
   - Tests only modify data with the test prefix

3. After tests complete:
   - All test data is removed
   - The database is left clean of test artifacts

### Running Tests Safely

To ensure tests are run safely:

1. **Use the E2E test commands**: `npm run test:e2e`
2. **Never** modify the test prefix unless you understand the implications
3. Keep `.env.test` properly configured
4. Run tests in the appropriate environment (not production)

## Screenshot Management

End-to-end tests often generate many screenshots for debugging and visual regression testing. We have implemented a robust screenshot management system to keep these organized:

### Screenshot Organization

All screenshots are automatically organized into a central `screenshots` directory with the following structure:

- `screenshots/debug/` - Contains all debug screenshots taken during test runs
- `screenshots/failures/` - Contains screenshots from test failures
- `screenshots/visual/` - Contains visual regression test screenshots

### Visual Test Report

A visual HTML report is generated after test runs, showing all screenshots in an easy-to-navigate interface. This helps with:

1. Quickly reviewing test failures
2. Comparing visual regression tests
3. Browsing all debug screenshots in one place

### Running Tests with Report Generation

To run end-to-end tests and generate a visual report:

```bash
npm run test:e2e:with-report
```

This will:
1. Run the end-to-end tests
2. Organize all screenshots
3. Generate an HTML report

### Working with Screenshots

You can also run these commands individually:

```bash
# Organize screenshots into the screenshots directory
npm run test:organize-screenshots

# Generate the visual report
npm run test:report
```

The report will be available at `screenshots/report.html`.
