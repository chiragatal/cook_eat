# Implemented Tests

This document provides a comprehensive list of all tests implemented in the Cook-Eat application.

## Current Test Issues

1. **Navigation Component Tests**: The Navigation component tests are currently failing due to issues with mocking the Next.js App Router. The error is "invariant expected app router to be mounted" in the UserSearch component. This needs to be fixed by properly mocking the App Router context or refactoring the component to be more testable.

2. **E2E Visual Regression Tests**: The visual regression tests might be flaky on different environments due to rendering differences. Consider adjusting the threshold or using more specific component-based screenshots.

## Unit Tests (Jest + React Testing Library)

Located in the `__tests__` directory:

### Component Tests

1. **Logo Component** (`__tests__/components/Logo.test.tsx`)
   - Renders with default props
   - Applies custom size
   - Applies custom className

2. **RecipeCard Component** (`__tests__/components/RecipeCard.test.tsx`)
   - Renders recipe information correctly
   - Shows "Make Public" when recipe is private
   - Calls onEdit when Edit button is clicked
   - Calls onDelete when Delete button is clicked
   - Calls onTogglePublic when visibility toggle is clicked

3. **Navigation Component** (`__tests__/components/Navigation.test.tsx`) - *Note: Currently has issues with App Router mocking*
   - Renders the navigation bar with logo and title
   - Shows user name when logged in
   - Handles theme toggle correctly
   - Shows "My Recipes" when in my recipes view

## End-to-End Tests (Playwright)

Located in the `e2e` directory:

### Home Page Tests (`e2e/home.spec.ts`)
1. Home page loads successfully
2. Navigation links work correctly
3. Responsive design works on mobile

### Recipe Functionality Tests (`e2e/recipes.spec.ts`)
1. Can view recipe list
2. Can search for recipes
3. Can view recipe details
4. Mobile view displays recipe properly

### Authentication Tests (`e2e/auth.spec.ts`)
1. Login page loads correctly
2. Signup page loads correctly
3. Login error is displayed for incorrect credentials
4. Login page displays correctly on mobile

### Visual Regression Tests (`e2e/visual.spec.ts`)
Takes screenshots of each page on different device sizes:
1. Home page (Desktop, Tablet, Mobile)
2. All Recipes page (Desktop, Tablet, Mobile)
3. My Recipes page (Desktop, Tablet, Mobile)
4. Login page (Desktop, Tablet, Mobile)
5. Register page (Desktop, Tablet, Mobile)

## Tests That Can Only Run in CI/CD

Currently, there are no tests that can only run in CI/CD. All tests can be run locally with the proper environment setup.

## Not Implemented Yet (Potential Future Tests)

1. API endpoint tests
2. Database integration tests
3. State management tests
4. Performance tests
5. Accessibility tests
6. Browser compatibility tests beyond Playwright's included browsers
