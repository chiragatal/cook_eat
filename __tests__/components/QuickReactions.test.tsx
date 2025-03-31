import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import QuickReactions from '../../app/components/QuickReactions';
import { useSession } from 'next-auth/react';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch API
global.fetch = jest.fn();

describe('QuickReactions Component', () => {
  const mockPostId = 'recipe-123';
  const mockOnReactionToggled = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnReactionToggled.mockReset();

    // Setup default mock session for authenticated user
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User' },
        expires: '2025-01-01',
      },
      status: 'authenticated',
    });

    // Setup default fetch response with some reactions
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        reactions: [
          { type: 'LOVE', count: 5, users: [{ id: 'user-1', name: 'Test User' }] },
          { type: 'YUM', count: 3, users: [{ id: 'user-2', name: 'Another User' }] }
        ],
        userReactions: ['LOVE']
      })
    });
  });

  it('renders loading state initially', async () => {
    render(<QuickReactions postId={mockPostId} />);
    expect(screen.getByTestId('loading-reactions')).toBeInTheDocument();
  });

  it('fetches and displays reactions correctly', async () => {
    await act(async () => {
      render(<QuickReactions postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Check that both reactions are displayed with correct counts
    const heartEmoji = screen.getByText('❤️');
    expect(heartEmoji).toBeInTheDocument();
    expect(heartEmoji.parentElement).toHaveTextContent('5');

    const yumEmoji = screen.getByText('😋');
    expect(yumEmoji).toBeInTheDocument();
    expect(yumEmoji.parentElement).toHaveTextContent('3');
  });

  it('highlights reactions the user has already made', async () => {
    await act(async () => {
      render(<QuickReactions postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // The LOVE reaction should be highlighted (user has reacted with it)
    const loveButton = screen.getByText('❤️').closest('button');
    expect(loveButton).toHaveClass('bg-indigo-100');
    expect(loveButton).toHaveClass('text-indigo-700');

    // The YUM reaction should not be highlighted
    const yumButton = screen.getByText('😋').closest('button');
    expect(yumButton).not.toHaveClass('bg-indigo-100');
    expect(yumButton).toHaveClass('bg-gray-100');
  });

  it('handles reaction toggling correctly', async () => {
    // Setup fetch to handle both requests
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reactions: [
            { type: 'LOVE', count: 5, users: [{ id: 'user-1', name: 'Test User' }] },
            { type: 'YUM', count: 3, users: [{ id: 'user-2', name: 'Another User' }] }
          ],
          userReactions: ['LOVE']
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reactions: [
            { type: 'LOVE', count: 4, users: [] },
            { type: 'YUM', count: 3, users: [{ id: 'user-2', name: 'Another User' }] }
          ],
          userReactions: []
        })
      });

    await act(async () => {
      render(<QuickReactions postId={mockPostId} onReactionToggled={mockOnReactionToggled} />);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Click the LOVE reaction to toggle it off
    const loveButton = screen.getByText('❤️').closest('button');
    await act(async () => {
      fireEvent.click(loveButton as HTMLElement);
    });

    // Check that the API was called correctly
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/posts/${mockPostId}/reactions`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'LOVE' })
      })
    );

    // Check callback was fired
    expect(mockOnReactionToggled).toHaveBeenCalledWith(mockPostId);

    // Check the UI updates
    expect(loveButton).not.toHaveClass('bg-indigo-100');
    expect(loveButton).toHaveClass('bg-gray-100');
  });

  it('shows reaction picker when there are no active reactions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        reactions: [],
        userReactions: []
      })
    });

    await act(async () => {
      render(<QuickReactions postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Should show the React button
    const reactButton = screen.getByText('React');
    expect(reactButton).toBeInTheDocument();

    // Click to show the reaction picker
    await act(async () => {
      fireEvent.click(reactButton);
    });

    // Check that all reaction options are shown
    expect(screen.getByTitle('Love')).toBeInTheDocument();
    expect(screen.getByTitle('Yum')).toBeInTheDocument();
    expect(screen.getByTitle('Want to try')).toBeInTheDocument();
    expect(screen.getByTitle('Made it')).toBeInTheDocument();
    expect(screen.getByTitle('Favorite')).toBeInTheDocument();
  });

  it('shows the + button when there are already reactions', async () => {
    await act(async () => {
      render(<QuickReactions postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Find the + button by its SVG path - more reliable than role='button' with empty name
    const plusButton = screen.getByRole('button', { name: '' });
    expect(plusButton).toBeInTheDocument();
    expect(plusButton.querySelector('svg')).toBeInTheDocument();

    // Click to show the reaction picker
    await act(async () => {
      fireEvent.click(plusButton);
    });

    // Wait for the picker to be visible
    await waitFor(() => {
      // Simply check that the emoji elements are in the document after clicking the + button
      expect(screen.getAllByText('❤️').length).toBeGreaterThan(1); // There should be at least 2 now (the existing reaction and the one in picker)
    });

    // Verify at least one reaction emoji is visible in the picker
    const emojiElements = ['❤️', '😋', '🔖', '👩‍🍳', '⭐'];
    const visibleEmojis = emojiElements.filter(emoji =>
      screen.getAllByText(emoji).length > 0
    );

    expect(visibleEmojis.length).toBeGreaterThan(0);
  });

  it('handles long press on reactions to show user list', async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(<QuickReactions postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Find the LOVE reaction button
    const loveButton = screen.getByText('❤️').closest('button');

    // Simulate touch start
    fireEvent.touchStart(loveButton as HTMLElement);

    // Fast-forward timers to trigger long press
    act(() => {
      jest.advanceTimersByTime(600); // Long press is set to 500ms
    });

    // Check if user list is shown
    expect(screen.getByText('Test User')).toBeVisible();

    // Cleanup
    jest.useRealTimers();
  });

  it('handles right-click on reactions to show user list', async () => {
    await act(async () => {
      render(<QuickReactions postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Find the LOVE reaction button
    const loveButton = screen.getByText('❤️').closest('button');

    // Simulate right click / context menu
    await act(async () => {
      fireEvent.contextMenu(loveButton as HTMLElement);
    });

    // Check if user list is shown
    expect(screen.getByText('Test User')).toBeVisible();
  });

  it('does not show reaction UI when user is not authenticated', async () => {
    // Setup unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        reactions: [],
        userReactions: []
      })
    });

    await act(async () => {
      render(<QuickReactions postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // When there are no reactions and user is not authenticated,
    // the component should not render anything
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });

  it('shows existing reactions but disables interaction for unauthenticated users', async () => {
    // Setup unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    await act(async () => {
      render(<QuickReactions postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Reactions should still be visible
    const loveButton = screen.getByText('❤️').closest('button');
    expect(loveButton).toBeInTheDocument();

    // But + button should not be there
    expect(screen.queryByRole('button', { name: '' })).not.toBeInTheDocument();

    // And clicking the reaction should not trigger API call
    await act(async () => {
      fireEvent.click(loveButton as HTMLElement);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial load call
  });

  it('handles API errors gracefully', async () => {
    // Mock console.error to prevent error output during test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup fetch to reject
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch reactions'));

    await act(async () => {
      render(<QuickReactions postId={mockPostId} />);
    });

    // Should finish loading
    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Should still render the component (empty state)
    expect(screen.getByText('React')).toBeInTheDocument();

    // Check error was logged
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching reactions:', expect.any(Error));

    // Restore console
    consoleSpy.mockRestore();
  });
});
