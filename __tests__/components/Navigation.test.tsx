import React from 'react';
import { render, act, waitFor, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navigation from '@/app/components/Navigation';
import { useSession } from 'next-auth/react';
import { NotificationProvider } from '@/app/contexts/NotificationContext';
import { ViewProvider } from '@/app/contexts/ViewContext';
import { ThemeProvider } from '@/app/contexts/ThemeContext';
import { MockAppRouterProvider } from '../test-utils/appRouterMock';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    forEach: jest.fn(),
    entries: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    toString: jest.fn()
  })),
  useSelectedLayoutSegments: jest.fn().mockReturnValue([])
}));

// Mock the NotificationContext
jest.mock('@/app/contexts/NotificationContext', () => {
  const actual = jest.requireActual('@/app/contexts/NotificationContext');
  return {
    ...actual,
    useNotifications: jest.fn(() => ({
      notifications: [],
      unreadCount: 0,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      fetchNotifications: jest.fn(),
      fetchPreferences: jest.fn(),
      preferences: [],
      updatePreference: jest.fn(),
    })),
  };
});

// Mock the ViewContext
jest.mock('@/app/contexts/ViewContext', () => {
  const actual = jest.requireActual('@/app/contexts/ViewContext');
  return {
    ...actual,
    useView: jest.fn(() => ({
      isMyRecipesView: true,
      selectedUserId: null,
      selectedUserName: null,
      toggleView: jest.fn(),
      setSelectedUser: jest.fn(),
    })),
  };
});

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

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock fetch responses
const mockFetchResponses = {
  '/api/notifications': { notifications: [] },
  '/api/notifications/preferences': { preferences: [] }
};

// Mock fetch implementation
global.fetch = jest.fn((url) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockFetchResponses[url as keyof typeof mockFetchResponses] || {}),
  })
) as jest.Mock;

// Create a wrapper component with all necessary providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockAppRouterProvider>
      <ThemeProvider>
        <NotificationProvider>
          <ViewProvider>
            {children}
          </ViewProvider>
        </NotificationProvider>
      </ThemeProvider>
    </MockAppRouterProvider>
  );
};

// Custom render function that includes providers and handles async updates
const customRender = async (ui: React.ReactElement) => {
  // Mock authenticated session before rendering
  (useSession as jest.Mock).mockReturnValue({
    data: {
      user: { name: 'Test User', email: 'test@example.com', id: '1' },
      expires: '2099-01-01',
    },
    status: 'authenticated',
  });

  let result;
  await act(async () => {
    result = render(ui, { wrapper: TestWrapper });
  });

  // Wait for all async operations to complete
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  return result;
};

describe('Navigation Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    // Clear localStorage
    window.localStorage.clear();

    // Remove dark mode class if present
    document.documentElement.classList.remove('dark');
  });

  it('renders the navigation bar with logo and title', async () => {
    await customRender(<Navigation />);
    expect(screen.getByText('Cook-Eat')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/notifications');
    expect(global.fetch).toHaveBeenCalledWith('/api/notifications/preferences');
  });

  it('shows user name when logged in', async () => {
    await customRender(<Navigation />);
    expect(screen.getByText('Hi, Test')).toBeInTheDocument();
  });

  it('handles theme toggle correctly', async () => {
    await customRender(<Navigation />);
    const themeToggleButton = screen.getByLabelText('Toggle dark mode');

    // Click the theme toggle button
    await act(async () => {
      fireEvent.click(themeToggleButton);
    });

    // Should add dark class
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Click again to toggle back
    await act(async () => {
      fireEvent.click(themeToggleButton);
    });

    // Should remove dark class
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('shows "My Recipes" when in my recipes view', async () => {
    // Override the mock for this specific test
    require('@/app/contexts/ViewContext').useView.mockReturnValue({
      isMyRecipesView: true,
      selectedUserId: null,
      selectedUserName: null,
      toggleView: jest.fn(),
      setSelectedUser: jest.fn(),
    });

    await customRender(<Navigation />);
    expect(screen.getByText('Viewing: My Recipes')).toBeInTheDocument();
  });

  it('shows user name when viewing another user\'s recipes', async () => {
    // Override the mock for this specific test
    require('@/app/contexts/ViewContext').useView.mockReturnValue({
      isMyRecipesView: false,
      selectedUserId: '2',
      selectedUserName: 'John Doe',
      toggleView: jest.fn(),
      setSelectedUser: jest.fn(),
    });

    await customRender(<Navigation />);
    expect(screen.getByText('Viewing: John Doe\'s Recipes')).toBeInTheDocument();
  });
});
