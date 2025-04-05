# Cook-Eat End-to-End Tests

This directory contains end-to-end tests for the Cook-Eat application using Playwright.

## Test Design Principles

1. **Isolation**: Tests run with their own database to avoid affecting production data
2. **Deterministic**: Tests create their own consistent test data
3. **Parallel**: Tests can run in parallel without conflicts
4. **Clean**: Tests clean up after themselves to leave no traces

## Test Organization

- `setup/` - Contains setup and utility files
- `utils/` - Common testing utility functions
- `*.spec.ts` - General test files that don't require authentication
- `*.auth.spec.ts` - Test files that use pre-authenticated state

## Running Tests

### Prerequisites

1. Create a test database:
   ```bash
   createdb cook_eat_test
   ```

2. Set up environment variables in `.env.test`

### Commands

- Run all tests:
  ```bash
  npm run test:e2e
  ```

- Run tests with UI mode:
  ```bash
  npm run test:e2e:ui
  ```

- Run tests in debug mode:
  ```bash
  npm run test:e2e:debug
  ```

- Run tests in specific browsers:
  ```bash
  npm run test:e2e:chrome
  npm run test:e2e:firefox
  npm run test:e2e:safari
  npm run test:e2e:mobile
  ```

- Setup test database manually:
  ```bash
  npm run test:setup-db
  ```

## Test Data Management

Tests use a dedicated database with consistent test data. The data is reset before each test suite runs to ensure tests are reliable and repeatable.

### Test User Account

- Email: test@example.com
- Password: password12345

## Adding New Tests

1. For general tests, create a new `.spec.ts` file in the `e2e` directory
2. For authenticated tests, create a new `.auth.spec.ts` file to use pre-authenticated state
3. Follow the patterns in existing test files
4. Use utilities from `utils/test-utils.ts` for common operations

## Best Practices

1. Keep tests independent - one test should not depend on another
2. Clean up any test data created during tests
3. Use descriptive test names that clearly indicate what is being tested
4. Add appropriate comments to clarify test logic
5. Keep tests focused on user-visible behavior, not implementation details

## Recent Improvements

We have implemented the following improvements to make the end-to-end tests more robust:

1. **Error Handling**: Added comprehensive error handling to continue tests even when authentication fails
2. **Route Corrections**: Updated tests to use the correct routes (`/auth/signin` instead of `/auth/login`)
3. **Flexible Selectors**: Made selectors more robust by using multiple alternatives (e.g., `input[type="email"], input[name="email"]`)
4. **Visual Debugging**: Added screenshot captures for debugging auth-related issues
5. **Test Isolation**: Implemented data prefixing (`test_e2e_`) to avoid affecting production data

## What the End-to-End Tests Do

### Authentication Tests
- Verify that signin and signup pages load correctly
- Test form validation with incorrect credentials
- Ensure authentication pages render correctly on mobile devices

### Recipe Tests
- Verify users can view recipe list and details
- Test search functionality
- Validate responsive design on various screen sizes
- Test mobile-specific features like the navigation menu

### Profile Tests (Authenticated)
- Check that authenticated users can access their profile
- Verify profile information is displayed correctly
- Test profile update functionality

## Troubleshooting End-to-End Tests

If you encounter issues with tests, check the following:

1. **Authentication Issues**:
   - Check the `signin-page-screenshot.png` to see if the page is loading
   - Verify credentials in `e2e/setup/test-database.ts`
   - Look for auth state in `e2e/setup/auth-state.json`

2. **Route Problems**:
   - Make sure the auth routes in tests match your actual app routes
   - Check if the app is running correctly with `npm run dev`

3. **Selector Issues**:
   - Update selectors to match your actual DOM elements
   - Use the Playwright UI mode to debug: `npm run test:e2e:ui`

4. **Database Problems**:
   - Verify your database is accessible from the test environment
   - Check for errors in the database setup process
