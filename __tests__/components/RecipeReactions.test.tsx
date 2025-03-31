import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecipeReactions from '@/app/components/RecipeReactions';
import { useSession } from 'next-auth/react';
import { REACTION_TYPES } from '@/app/api/posts/[id]/reactions/types';

// Mock the useSession hook
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('RecipeReactions Component', () => {
  const mockPostId = 'post-123';

  // Mock reaction data
  const mockReactions = [
    { type: 'LOVE', count: 5, users: [{ id: 'user1', name: 'User One' }, { id: 'user2', name: 'User Two' }] },
    { type: 'YUM', count: 3, users: [{ id: 'user3', name: 'User Three' }] },
    { type: 'WANT_TO_TRY', count: 0, users: [] },
  ];

  const mockUserReactions = ['LOVE'];

  // Mock fetch responses
  const mockFetchResponse = {
    reactions: mockReactions,
    userReactions: mockUserReactions,
  };

  // Configure mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFetchResponse,
    });

    // Mock authenticated session by default
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user1', name: 'Test User' } },
      status: 'authenticated',
    });
  });

  it('renders loading state initially', () => {
    render(<RecipeReactions postId={mockPostId} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('fetches and displays reactions on mount', async () => {
    render(<RecipeReactions postId={mockPostId} />);

    // Check that fetch was called with correct URL
    expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPostId}/reactions`);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check that all reaction buttons are rendered
    expect(screen.getByText('Love')).toBeInTheDocument();
    expect(screen.getByText('Yum')).toBeInTheDocument();
    expect(screen.getByText('Want to try')).toBeInTheDocument();
    expect(screen.getByText('Made it')).toBeInTheDocument();
    expect(screen.getByText('Favorite')).toBeInTheDocument();

    // Check that reaction counts are displayed
    expect(screen.getByText('Love').closest('button')).toHaveTextContent('5');
    expect(screen.getByText('Yum').closest('button')).toHaveTextContent('3');
  });

  it('highlights reactions that the user has made', async () => {
    render(<RecipeReactions postId={mockPostId} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Get all reaction buttons
    const loveButton = screen.getByText('Love').closest('button');
    const yumButton = screen.getByText('Yum').closest('button');

    // Check that the Love button (which the user has reacted with) has the highlighted class
    expect(loveButton).toHaveClass('bg-indigo-100');
    expect(loveButton).toHaveClass('text-indigo-700');

    // Check that other buttons don't have the highlighted class
    expect(yumButton).toHaveClass('bg-gray-100');
    expect(yumButton).toHaveClass('text-gray-700');
  });

  it('toggles reaction when a reaction button is clicked', async () => {
    const onReactionToggled = jest.fn();

    render(<RecipeReactions postId={mockPostId} onReactionToggled={onReactionToggled} />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Mock the response for toggling a reaction
    const updatedResponse = {
      reactions: [
        ...mockReactions.slice(0, 1),
        { ...mockReactions[1], count: 4, users: [...mockReactions[1].users, { id: 'user1', name: 'Test User' }] },
        ...mockReactions.slice(2),
      ],
      userReactions: [...mockUserReactions, 'YUM'],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedResponse,
    });

    // Click the Yum button to toggle the reaction
    const yumButton = screen.getByText('Yum').closest('button');
    fireEvent.click(yumButton!);

    // Check that fetch was called with the correct method and body
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/posts/${mockPostId}/reactions`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'YUM' }),
      })
    );
  });

  it('disables reaction buttons when user is not authenticated', async () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<RecipeReactions postId={mockPostId} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Get all reaction buttons
    const buttons = screen.getAllByRole('button');

    // Check that all buttons are disabled
    buttons.forEach(button => {
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50');
      expect(button).toHaveClass('cursor-not-allowed');
    });

    // Click one of the buttons and verify that fetch is not called
    fireEvent.click(buttons[0]);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial fetch, not the reaction
  });

  it('handles fetch errors gracefully', async () => {
    // Mock a failed initial fetch
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // Spy on console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<RecipeReactions postId={mockPostId} />);

    // Wait for the error to be logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching reactions:',
        expect.any(Error)
      );
    });

    // Check that the component renders without loading spinner
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('shows user list when hovering over reaction with users', async () => {
    // Set up user-event for this test case
    render(<RecipeReactions postId={mockPostId} />);

    // Wait for loading to finish and content to appear
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByText('Love')).toBeInTheDocument();
    });

    // Find the Love button which has users
    const loveButton = screen.getByText('Love').closest('button');

    // Note: We can't fully test hover state with react-testing-library,
    // but we can check that the user list is in the DOM (but visually hidden)
    const userList = screen.getByText('Love • 5');
    expect(userList).toBeInTheDocument();
    expect(userList.parentElement).toHaveClass('invisible');

    // Check that user names are in the DOM
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });
});
