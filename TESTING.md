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
