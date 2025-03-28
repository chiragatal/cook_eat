import React from 'react';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
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

// Create router mock that can be configured by tests
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

// Mock for useSearchParams that can be reconfigured in tests
let mockActionParam = null;

jest.mock('next/navigation', () => {
  const mockUseRouter = jest.fn();
  const mockUseSearchParams = jest.fn();

  return {
    useRouter: mockUseRouter,
    useSearchParams: mockUseSearchParams,
  };
});

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
      <button data-testid="save-recipe" onClick={() => onSave({ title: 'New Recipe', content: 'Test content' })}>Save</button>
      <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
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

    // Reset router mock
    const { useRouter } = require('next/navigation');
    useRouter.mockImplementation(() => ({
      push: mockRouter.push,
      replace: mockRouter.replace,
    }));

    // Reset search params mock
    const { useSearchParams } = require('next/navigation');
    useSearchParams.mockImplementation(() => ({
      get: jest.fn().mockReturnValue(null),
    }));

    // Reset mocks
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
  });

  it('renders the main content with recipe list and calendar', async () => {
    // Mock h1 title to be "All Public Recipes"
    jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === 'h1') {
        return {
          textContent: 'All Public Recipes'
        } as unknown as Element;
      }
      return null;
    });

    render(
      <ViewProvider>
        <HomeContent />
      </ViewProvider>
    );

    // Check that the main components are rendered
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-list')).toBeInTheDocument();
    expect(screen.getByTestId('calendar')).toBeInTheDocument();

    // Check that the Create New Recipe button is visible
    expect(screen.getByText('Create New Recipe')).toBeInTheDocument();
  });

  it('handles date selection from calendar', async () => {
    const RecipeList = require('@/app/components/RecipeList');
    RecipeList.mockImplementation(({ selectedDate }: { selectedDate: Date | null }) => (
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
});
