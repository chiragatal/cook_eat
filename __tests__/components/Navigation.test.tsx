import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '@/app/components/Navigation';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock the ViewContext
jest.mock('@/app/contexts/ViewContext', () => ({
  useView: jest.fn(() => ({
    isMyRecipesView: true,
    selectedUserId: null,
    selectedUserName: null,
    toggleView: jest.fn(),
  })),
}));

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: function(key: string) {
      return store[key] || null;
    },
    setItem: function(key: string, value: string) {
      store[key] = value.toString();
    },
    clear: function() {
      store = {};
    },
    removeItem: function(key: string) {
      delete store[key];
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Navigation Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set mocked path value
    const usePathnameFunc = usePathname as jest.MockedFunction<typeof usePathname>;
    usePathnameFunc.mockReturnValue('/');

    // Set up document element for theme toggle tests
    document.documentElement.classList.remove('dark');

    // Mock authenticated session by default
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com', id: '1' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    });

    // Clear localStorage
    window.localStorage.clear();
  });

  it('renders the navigation bar with logo and title', () => {
    render(<Navigation />);

    // Check for the logo and title
    expect(screen.getByText('Cook-Eat')).toBeInTheDocument();
  });

  it('shows user name when logged in', () => {
    render(<Navigation />);

    // Check that it shows the user name
    expect(screen.getByText('Hi, Test')).toBeInTheDocument();
  });

  it('handles theme toggle correctly', () => {
    render(<Navigation />);

    // Find and click the theme toggle button
    const themeToggleButton = screen.getByLabelText('Toggle dark mode');
    fireEvent.click(themeToggleButton);

    // Check that dark mode has been applied
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Click again to toggle back
    fireEvent.click(themeToggleButton);

    // Check that dark mode has been removed
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('shows "My Recipes" when in my recipes view', () => {
    // Mock useView to return isMyRecipesView as true
    require('@/app/contexts/ViewContext').useView.mockReturnValue({
      isMyRecipesView: true,
      selectedUserId: null,
      selectedUserName: null,
      toggleView: jest.fn(),
    });

    render(<Navigation />);

    expect(screen.getByText('Viewing: My Recipes')).toBeInTheDocument();
  });
});
