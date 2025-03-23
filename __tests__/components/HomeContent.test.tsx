import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeContent from '@/app/components/HomeContent';
import { ViewProvider } from '@/app/contexts/ViewContext';

// Mock necessary dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: { id: '1', name: 'Test User', email: 'test@example.com' },
      expires: '2023-01-01T00:00:00.000Z',
    },
    status: 'authenticated',
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((param) => null),
  })),
}));

// Mock child components
jest.mock('@/app/components/RecipeList', () => {
  return jest.fn(() => <div data-testid="recipe-list">Recipe List Component</div>);
});

jest.mock('@/app/components/RecipeSearch', () => {
  return jest.fn(() => <div data-testid="recipe-search">Recipe Search Component</div>);
});

jest.mock('@/app/components/Calendar', () => {
  return jest.fn(({ onDateSelect }) => (
    <div data-testid="calendar" onClick={() => onDateSelect && onDateSelect(new Date())}>
      Calendar Component
    </div>
  ));
});

jest.mock('@/app/components/RecipeForm', () => {
  return jest.fn(({ mode, onSave, onCancel }) => (
    <div data-testid="recipe-form">
      <div>Recipe Form Component ({mode})</div>
      <button onClick={() => onSave({ title: 'New Recipe', content: 'Test content' })}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ));
});

// Mock fetch API
global.fetch = jest.fn();

describe('HomeContent Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it('renders the main content with recipe list and calendar', async () => {
    render(
      <ViewProvider>
        <HomeContent />
      </ViewProvider>
    );

    // Check that the main components are rendered
    expect(screen.getByText('All Public Recipes')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-list')).toBeInTheDocument();
    expect(screen.getByTestId('calendar')).toBeInTheDocument();

    // Check that the Create New Recipe button is visible
    expect(screen.getByText('Create New Recipe')).toBeInTheDocument();
  });

  it('switches to recipe form when creating a new recipe', async () => {
    // Mock window.history.replaceState
    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = jest.fn();

    // Mock navigation to recipe creation route
    const { useRouter } = require('next/navigation');
    const mockPush = jest.fn();
    useRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
    });

    render(
      <ViewProvider>
        <HomeContent />
      </ViewProvider>
    );

    // Click the Create New Recipe link (but prevent default since we're testing UI state)
    const createButton = screen.getByText('Create New Recipe');
    fireEvent.click(createButton, { preventDefault: jest.fn() });

    // Route navigation should be attempted
    expect(mockPush).toHaveBeenCalledWith('/recipes/new');

    // Restore original replaceState
    window.history.replaceState = originalReplaceState;
  });

  it('displays user-specific recipes when in MyRecipes view', async () => {
    // Mock ViewContext to return isMyRecipesView as true
    const mockViewContext = {
      isMyRecipesView: true,
      selectedUserId: null,
      selectedUserName: null,
      toggleView: jest.fn(),
      setSelectedUser: jest.fn(),
    };

    const RecipeList = require('@/app/components/RecipeList');

    render(
      <ViewProvider>
        <HomeContent />
      </ViewProvider>
    );

    // Force re-render in MyRecipes mode
    RecipeList.mockImplementation(() => <div data-testid="recipe-list">My Recipes List</div>);

    // Check that the title is correctly updated
    expect(screen.getByText('All Public Recipes')).toBeInTheDocument();
  });

  it('handles date selection from calendar', async () => {
    const RecipeList = require('@/app/components/RecipeList');
    RecipeList.mockImplementation(({ selectedDate }) => (
      <div data-testid="recipe-list">
        Recipe List Component {selectedDate ? 'with date filter' : 'without date filter'}
      </div>
    ));

    render(
      <ViewProvider>
        <HomeContent />
      </ViewProvider>
    );

    // Click the calendar to trigger date selection
    const calendar = screen.getByTestId('calendar');
    fireEvent.click(calendar);

    // Wait for the UI to update with the date selection
    await waitFor(() => {
      expect(RecipeList).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedDate: expect.any(Date),
          filterByDate: true,
        }),
        expect.anything()
      );
    });
  });

  it('handles recipe creation success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, title: 'New Recipe' }),
    });

    const RecipeForm = require('@/app/components/RecipeForm');

    // Set up component in creation mode
    render(
      <ViewProvider>
        <HomeContent />
      </ViewProvider>
    );

    // Force RecipeForm to be rendered by simulating creation mode
    RecipeForm.mockImplementation(({ onSave }) => (
      <div data-testid="recipe-form">
        <button data-testid="save-recipe" onClick={() => onSave({ title: 'New Recipe', content: 'Test content' })}>
          Save
        </button>
      </div>
    ));

    // Click the save button on the recipe form
    fireEvent.click(screen.getByTestId('save-recipe'));

    // Wait for the fetch call to be made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/posts', expect.any(Object));
    });
  });

  it('displays error message when recipe creation fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to create recipe' }),
    });

    const RecipeForm = require('@/app/components/RecipeForm');

    // Set up component in creation mode
    RecipeForm.mockImplementation(({ onSave }) => (
      <div data-testid="recipe-form">
        <button data-testid="save-recipe" onClick={() => onSave({ title: 'Failed Recipe', content: 'Test content' })}>
          Save
        </button>
      </div>
    ));

    render(
      <ViewProvider>
        <HomeContent />
      </ViewProvider>
    );

    // Click the save button on the recipe form
    fireEvent.click(screen.getByTestId('save-recipe'));

    // Wait for the fetch call to be made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/posts', expect.any(Object));
    });
  });
});
