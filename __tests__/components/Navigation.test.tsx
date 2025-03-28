import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import Navigation from '@/app/components/Navigation';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NotificationProvider } from '@/app/contexts/NotificationContext';
import { ViewProvider } from '@/app/contexts/ViewContext';
import { ThemeProvider } from '@/app/contexts/ThemeContext';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
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
  }))
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
    <ThemeProvider>
      <NotificationProvider>
        <ViewProvider>
          {children}
        </ViewProvider>
      </NotificationProvider>
    </ThemeProvider>
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
  await act(async () => {
    await Promise.resolve();
  });

  return result;
};

describe('Navigation Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    // Set mocked path value
    const usePathnameFunc = usePathname as jest.MockedFunction<typeof usePathname>;
    usePathnameFunc.mockReturnValue('/');

    // Set up document element for theme toggle tests
    document.documentElement.classList.remove('dark');

    // Clear localStorage
    window.localStorage.clear();
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

    await act(async () => {
      fireEvent.click(themeToggleButton);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await act(async () => {
      fireEvent.click(themeToggleButton);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('shows "My Recipes" when in my recipes view', async () => {
    require('@/app/contexts/ViewContext').useView.mockReturnValue({
      isMyRecipesView: true,
      selectedUserId: null,
      selectedUserName: null,
      toggleView: jest.fn(),
    });

    await customRender(<Navigation />);
    expect(screen.getByText('Viewing: My Recipes')).toBeInTheDocument();
  });
});
