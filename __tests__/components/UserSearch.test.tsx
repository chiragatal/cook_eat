import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserSearch from '@/app/components/UserSearch';
import { ViewProvider } from '@/app/contexts/ViewContext';
import * as router from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock fetch API
global.fetch = jest.fn();

describe('UserSearch Component', () => {
  const mockOnUserSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it('renders the search input', () => {
    render(
      <ViewProvider>
        <UserSearch />
      </ViewProvider>
    );

    // Check that the search input is rendered
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('displays no results message when no users match', async () => {
    // Mock empty response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <ViewProvider>
        <UserSearch />
      </ViewProvider>
    );

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'nonexistentuser' } });
    fireEvent.focus(searchInput);

    // Wait for the debounced search and async rendering
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('calls setSelectedUser when a user is clicked', async () => {
    // Mock users response
    const mockUsers = [
      { id: '1', name: 'Test User', email: 'test@example.com' },
      { id: '2', name: 'Another User', email: 'another@example.com' },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    });

    render(
      <ViewProvider>
        <UserSearch />
      </ViewProvider>
    );

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.focus(searchInput);

    // Wait for user list to appear
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    // Click on a user
    fireEvent.click(screen.getByText('Test User'));

    // Verify that the dropdown closes (indirectly checking that setSelectedUser was called)
    await waitFor(() => {
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });
  });
});
