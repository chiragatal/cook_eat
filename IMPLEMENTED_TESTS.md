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

4. **NotificationList Component** (`__tests__/components/NotificationList.test.tsx`)
   - Renders notification button with correct unread count
   - Displays notification dropdown when button is clicked
   - Displays correct notification content for different notification types
   - Calls markAsRead when notification is clicked
   - Calls markAllAsRead when "Mark all as read" is clicked
   - Renders empty state when there are no notifications
   - Displays notification settings when settings button is clicked
   - Closes settings modal when close button is clicked

5. **NotificationPreferences Component** (`__tests__/components/NotificationPreferences.test.tsx`)
   - Renders all notification types with correct labels
   - Displays correct toggle state for each preference
   - Calls updatePreference when a toggle is clicked
   - Disables toggles while updating
   - Displays error message when update fails
   - Handles empty or undefined preferences gracefully

6. **Calendar Component** (`__tests__/components/Calendar.test.tsx`)
   - Renders the calendar with correct month and year
   - Renders the correct weekdays
   - Navigates to previous month when prev button is clicked
   - Navigates to next month when next button is clicked
   - Fetches recipes when component mounts
   - Shows loading state while fetching recipes
   - Handles fetch errors gracefully
   - Shows recipe list when a date with recipes is clicked
   - Calls onDateSelect callback when a date is selected
   - Shows different header when in MyRecipes view
   - Adds myRecipes parameter to fetch when in MyRecipes view

7. **RecipeReactions Component** (`__tests__/components/RecipeReactions.test.tsx`)
   - Renders loading state initially
   - Fetches and displays reactions on mount
   - Highlights reactions that the user has made
   - Toggles reaction when a reaction button is clicked
   - Disables reaction buttons when user is not authenticated
   - Handles fetch errors gracefully
   - Shows user list when hovering over reaction with users

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
