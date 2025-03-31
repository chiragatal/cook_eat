import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import CommentReactions from '@/app/components/CommentReactions';
import { useSession } from 'next-auth/react';
import { COMMENT_REACTION_TYPES } from '@/app/api/comments/[id]/reactions/types';

// Mock the useSession hook
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('CommentReactions Component', () => {
  const mockCommentId = 'comment-123';

  // Mock reaction data
  const mockReactions = [
    { type: 'LIKE', count: 5, users: [{ id: 'user1', name: 'User One' }, { id: 'user2', name: 'User Two' }] },
    { type: 'LOVE', count: 2, users: [{ id: 'user3', name: 'User Three' }] },
    { type: 'LAUGH', count: 0, users: [] },
  ];

  const mockUserReactions = ['LIKE'];

  // Mock fetch responses
  const mockFetchResponse = {
    reactions: mockReactions,
    userReactions: mockUserReactions,
  };

  // Helper function to create a resolved promise that can be controlled
  function createControlledPromise() {
    let resolve: (value: any) => void = () => {};
    const promise = new Promise(r => {
      resolve = r;
    });
    return { promise, resolve };
  }

  // Configure mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated session by default
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user1', name: 'Test User' } },
      status: 'authenticated',
    });
  });

  it('renders loading state initially', async () => {
    // Delay fetch response to keep loading state visible
    const { promise, resolve } = createControlledPromise();

    (global.fetch as jest.Mock).mockImplementation(() => {
      return promise.then(() => ({
        ok: true,
        json: () => Promise.resolve(mockFetchResponse)
      }));
    });

    render(<CommentReactions commentId={mockCommentId} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Allow test to complete
    await act(async () => {
      resolve(true);
    });
  });

  it('fetches and displays reactions on mount', async () => {
    // Set up controlled promise
    const { promise, resolve } = createControlledPromise();

    (global.fetch as jest.Mock).mockImplementation(() => {
      return promise.then(() => ({
        ok: true,
        json: () => Promise.resolve(mockFetchResponse)
      }));
    });

    await act(async () => {
      render(<CommentReactions commentId={mockCommentId} />);
    });

    // Check that fetch was called with correct URL
    expect(global.fetch).toHaveBeenCalledWith(`/api/comments/${mockCommentId}/reactions`);

    // Initially in loading state
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Resolve the fetch
    await act(async () => {
      resolve(true);
    });

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    // Should only display reactions with count > 0
    expect(screen.getByText('👍')).toBeInTheDocument();
    expect(screen.getByText('❤️')).toBeInTheDocument();

    // Reaction counts are displayed
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('highlights reactions that the user has made', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFetchResponse)
    });

    let rendered;
    await act(async () => {
      rendered = render(<CommentReactions commentId={mockCommentId} />);

      // Wait for all promises to resolve within act
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Get the LIKE button (which user has already reacted with)
    const likeButton = screen.getByText('👍').closest('button');
    const loveButton = screen.getByText('❤️').closest('button');

    // Check that the LIKE button (which the user has reacted with) has the highlighted class
    expect(likeButton).toHaveClass('bg-blue-50');
    expect(likeButton).toHaveClass('text-blue-600');

    // Check that other buttons don't have the highlighted class
    expect(loveButton).toHaveClass('bg-gray-50');
    expect(loveButton).toHaveClass('text-gray-600');
  });

  it('toggles reaction when a reaction button is clicked', async () => {
    const onReactionToggled = jest.fn();

    // Initial fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFetchResponse)
    });

    // Response for toggle action
    const updatedResponse = {
      reactions: [
        { type: 'LIKE', count: 4, users: [{ id: 'user2', name: 'User Two' }] },
        { type: 'LOVE', count: 3, users: [{ id: 'user1', name: 'Test User' }, { id: 'user3', name: 'User Three' }] },
        { type: 'LAUGH', count: 0, users: [] },
      ],
      userReactions: ['LOVE'],
    };

    // Second fetch for the toggle action
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(updatedResponse)
    });

    await act(async () => {
      render(<CommentReactions commentId={mockCommentId} onReactionToggled={onReactionToggled} />);

      // Wait for initial fetch to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Click the LOVE button to toggle the reaction
    const loveButton = screen.getByText('❤️').closest('button');

    await act(async () => {
      fireEvent.click(loveButton!);

      // Wait for toggle action to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Check that fetch was called with the correct method and body
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/comments/${mockCommentId}/reactions`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'LOVE' }),
      })
    );

    // Verify callback was called
    expect(onReactionToggled).toHaveBeenCalled();
  });

  it('displays react button when no reactions and user is authenticated', async () => {
    // Mock empty reactions
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reactions: [], userReactions: [] })
    });

    await act(async () => {
      render(<CommentReactions commentId={mockCommentId} />);

      // Wait for fetch to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should display the "React" button
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('shows reaction picker when React button is clicked', async () => {
    // Mock empty reactions
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reactions: [], userReactions: [] })
    });

    await act(async () => {
      render(<CommentReactions commentId={mockCommentId} />);

      // Wait for fetch to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Click the "React" button
    await act(async () => {
      fireEvent.click(screen.getByText('React'));
    });

    // Should show all reaction options
    expect(screen.getByTitle('Like')).toBeInTheDocument();
    expect(screen.getByTitle('Love')).toBeInTheDocument();
    expect(screen.getByTitle('Laugh')).toBeInTheDocument();
    expect(screen.getByTitle('Insightful')).toBeInTheDocument();
    expect(screen.getByTitle('Helpful')).toBeInTheDocument();
  });

  it('does not render anything when no reactions and user is not authenticated', async () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    // Mock empty reactions
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reactions: [], userReactions: [] })
    });

    await act(async () => {
      render(<CommentReactions commentId={mockCommentId} />);

      // Wait for fetch to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should not display any reaction elements or loading indicator
    expect(screen.queryByTestId('loading-indicator')).toBeNull();
    expect(screen.queryByTestId(/comment-reactions/)).toBeNull();
  });

  it('handles fetch errors gracefully', async () => {
    // Mock a failed fetch
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

    // Spy on console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(<CommentReactions commentId={mockCommentId} />);

      // Wait for fetch to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Check that error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching comment reactions:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
