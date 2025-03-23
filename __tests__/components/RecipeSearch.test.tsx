import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeSearch from '@/app/components/RecipeSearch';
import { useSession } from 'next-auth/react';
import { CATEGORIES, REACTION_FILTERS } from '@/app/lib/constants';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

describe('RecipeSearch Component', () => {
  const onSearchMock = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock authenticated session by default
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com', id: '1' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    });
  });

  it('renders all search elements for authenticated users', () => {
    render(<RecipeSearch onSearch={onSearchMock} />);

    // Check for search input
    expect(screen.getByPlaceholderText('Search recipes...')).toBeInTheDocument();

    // Check for category dropdown
    expect(screen.getByLabelText('Category')).toBeInTheDocument();

    // Check for visibility dropdown (should be present for authenticated users)
    expect(screen.getByLabelText('Visibility')).toBeInTheDocument();

    // Check for quick filters - using text content since it's not linked to a form control
    expect(screen.getByText('Quick Filters')).toBeInTheDocument();

    // Check that all reaction filters are present
    REACTION_FILTERS.forEach(filter => {
      expect(screen.getByText(new RegExp(`${filter.emoji}.*${filter.label}`))).toBeInTheDocument();
    });
  });

  it('does not show visibility filter for unauthenticated users', () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<RecipeSearch onSearch={onSearchMock} />);

    // Visibility dropdown should not be present
    expect(screen.queryByLabelText('Visibility')).not.toBeInTheDocument();
  });

  it('calls onSearch when search query is changed', () => {
    render(<RecipeSearch onSearch={onSearchMock} />);

    const searchInput = screen.getByPlaceholderText('Search recipes...');
    fireEvent.change(searchInput, { target: { value: 'pasta' } });

    // Check that onSearch was called with the correct parameters
    expect(onSearchMock).toHaveBeenCalledWith(expect.objectContaining({
      query: 'pasta',
      category: '',
      visibility: 'all',
      reactionFilter: '',
    }));
  });

  it('calls onSearch when category is changed', () => {
    render(<RecipeSearch onSearch={onSearchMock} />);

    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: 'Dinner' } });

    // Check that onSearch was called with the correct parameters
    expect(onSearchMock).toHaveBeenCalledWith(expect.objectContaining({
      query: '',
      category: 'Dinner',
      visibility: 'all',
      reactionFilter: '',
    }));
  });

  it('calls onSearch when visibility is changed', () => {
    render(<RecipeSearch onSearch={onSearchMock} />);

    const visibilitySelect = screen.getByLabelText('Visibility');
    fireEvent.change(visibilitySelect, { target: { value: 'private' } });

    // Check that onSearch was called with the correct parameters
    expect(onSearchMock).toHaveBeenCalledWith(expect.objectContaining({
      query: '',
      category: '',
      visibility: 'private',
      reactionFilter: '',
    }));
  });

  it('toggles reaction filter when clicked', () => {
    render(<RecipeSearch onSearch={onSearchMock} />);

    // Find the first reaction filter button
    const favoriteFilterButton = screen.getByText(/⭐.*My Favorites/);

    // Click to select
    fireEvent.click(favoriteFilterButton);

    // Check that onSearch was called with the reaction filter set
    expect(onSearchMock).toHaveBeenCalledWith(expect.objectContaining({
      reactionFilter: 'FAVORITE',
    }));

    // Clear onSearchMock to check next call
    onSearchMock.mockClear();

    // Click again to deselect
    fireEvent.click(favoriteFilterButton);

    // Check that onSearch was called with the reaction filter cleared
    expect(onSearchMock).toHaveBeenCalledWith(expect.objectContaining({
      reactionFilter: '',
    }));
  });
});
