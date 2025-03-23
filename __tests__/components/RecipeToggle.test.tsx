import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeToggle from '@/app/components/RecipeToggle';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

describe('RecipeToggle Component', () => {
  const pushMock = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set mocked path value
    const usePathnameFunc = usePathname as jest.MockedFunction<typeof usePathname>;
    usePathnameFunc.mockReturnValue('/my-recipes');

    // Mock router
    const useRouterFunc = useRouter as jest.MockedFunction<typeof useRouter>;
    useRouterFunc.mockReturnValue({
      push: pushMock,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn()
    } as any);

    // Mock authenticated session by default
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com', id: '1' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    });
  });

  it('renders correctly in My Recipes view', () => {
    render(<RecipeToggle />);

    const myRecipesButton = screen.getByText('My Recipes');
    const allRecipesButton = screen.getByText('All Recipes');

    expect(myRecipesButton).toBeInTheDocument();
    expect(allRecipesButton).toBeInTheDocument();

    // Check that My Recipes button has active styling
    expect(myRecipesButton.className).toContain('bg-indigo-600');
    expect(allRecipesButton.className).not.toContain('bg-indigo-600');
  });

  it('renders correctly in All Recipes view', () => {
    // Change pathname to all-recipes
    const usePathnameFunc = usePathname as jest.MockedFunction<typeof usePathname>;
    usePathnameFunc.mockReturnValue('/all-recipes');

    render(<RecipeToggle />);

    const myRecipesButton = screen.getByText('My Recipes');
    const allRecipesButton = screen.getByText('All Recipes');

    // Check that All Recipes button has active styling
    expect(myRecipesButton.className).not.toContain('bg-indigo-600');
    expect(allRecipesButton.className).toContain('bg-indigo-600');
  });

  it('navigates to My Recipes when clicked', () => {
    // Start from all-recipes view
    const usePathnameFunc = usePathname as jest.MockedFunction<typeof usePathname>;
    usePathnameFunc.mockReturnValue('/all-recipes');

    render(<RecipeToggle />);

    const myRecipesButton = screen.getByText('My Recipes');
    fireEvent.click(myRecipesButton);

    expect(pushMock).toHaveBeenCalledWith('/my-recipes');
  });

  it('navigates to All Recipes when clicked', () => {
    render(<RecipeToggle />);

    const allRecipesButton = screen.getByText('All Recipes');
    fireEvent.click(allRecipesButton);

    expect(pushMock).toHaveBeenCalledWith('/all-recipes');
  });

  it('returns null when user is not authenticated', () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    const { container } = render(<RecipeToggle />);

    // Component should render nothing
    expect(container.firstChild).toBeNull();
  });
});
