import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import QuickReactions from '@/app/components/QuickReactions';
import * as nextAuth from 'next-auth/react';

// Mock useSession hook
jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react');
  return {
    __esModule: true,
    ...originalModule,
    useSession: jest.fn(),
  };
});

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      reactions: [
        { type: 'LOVE', count: 5, users: [{ id: '1', name: 'John Doe' }, { id: '2', name: 'Jane Smith' }] },
        { type: 'YUM', count: 3, users: [{ id: '3', name: 'Bob Johnson' }] },
        { type: 'WANT_TO_TRY', count: 0, users: [] },
        { type: 'MADE_IT', count: 2, users: [{ id: '4', name: 'Alice Brown' }] },
        { type: 'FAVORITE', count: 1, users: [{ id: '5', name: 'Charlie Green' }] }
      ],
      userReactions: ['LOVE']
    })
  })
) as jest.Mock;

describe('QuickReactions', () => {
  const mockSession = {
    expires: "1",
    user: { id: "1", name: "John Doe", email: "john@example.com" }
  };

  const mockNoSession = { data: null, status: "unauthenticated" };
  const mockWithSession = { data: mockSession, status: "authenticated" };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock timers for setTimeout-related tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore timers
    jest.useRealTimers();
  });

  it('renders loading state initially', () => {
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockWithSession);

    render(
      <SessionProvider session={mockSession}>
        <QuickReactions postId="123" />
      </SessionProvider>
    );

    expect(screen.getByTestId('loading-reactions')).toBeInTheDocument();
  });

  it('fetches and displays reactions on mount', async () => {
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockWithSession);

    render(
      <SessionProvider session={mockSession}>
        <QuickReactions postId="123" />
      </SessionProvider>
    );

    expect(global.fetch).toHaveBeenCalledWith('/api/posts/123/reactions');

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('😋')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('highlights reactions the user has made', async () => {
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockWithSession);

    render(
      <SessionProvider session={mockSession}>
        <QuickReactions postId="123" />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // The LOVE reaction should have the highlighted class
    const loveButton = screen.getByTitle('Love');
    expect(loveButton).toHaveClass('bg-indigo-100');
    expect(loveButton).toHaveClass('text-indigo-700');

    // Other reactions should not have the highlighted class
    const yumButton = screen.getByTitle('Yum');
    expect(yumButton).not.toHaveClass('bg-indigo-100');
    expect(yumButton).not.toHaveClass('text-indigo-700');
  });

  it('toggles reaction when a reaction button is clicked', async () => {
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockWithSession);

    const mockToggleCallback = jest.fn();

    render(
      <SessionProvider session={mockSession}>
        <QuickReactions postId="123" onReactionToggled={mockToggleCallback} />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Reset the fetch mock to prepare for the next fetch
    (global.fetch as jest.Mock).mockClear();

    // Mock the response for toggling a reaction
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        reactions: [
          { type: 'LOVE', count: 4, users: [{ id: '2', name: 'Jane Smith' }] },
          { type: 'YUM', count: 3, users: [{ id: '3', name: 'Bob Johnson' }] },
          { type: 'WANT_TO_TRY', count: 0, users: [] },
          { type: 'MADE_IT', count: 2, users: [{ id: '4', name: 'Alice Brown' }] },
          { type: 'FAVORITE', count: 1, users: [{ id: '5', name: 'Charlie Green' }] }
        ],
        userReactions: []
      })
    });

    // Click on the LOVE reaction to toggle it off
    fireEvent.click(screen.getByTitle('Love'));

    expect(global.fetch).toHaveBeenCalledWith('/api/posts/123/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'LOVE' }),
    });

    await waitFor(() => {
      expect(mockToggleCallback).toHaveBeenCalledWith('123');
    });

    // After toggling, the count should update and the class should change
    await waitFor(() => {
      expect(screen.getByTitle('Love')).not.toHaveClass('bg-indigo-100');
      expect(screen.getByTitle('Love')).not.toHaveClass('text-indigo-700');
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('disables reaction buttons when user is not authenticated', async () => {
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockNoSession);

    render(
      <SessionProvider session={null}>
        <QuickReactions postId="123" />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Reactions should be rendered, but clicking them should not trigger a fetch
    (global.fetch as jest.Mock).mockClear();

    fireEvent.click(screen.getByTitle('Love - Sign in to react'));

    expect(global.fetch).not.toHaveBeenCalled();

    // Verify title includes the sign in message
    expect(screen.getByTitle('Love - Sign in to react')).toBeInTheDocument();
  });

  it('shows user list when hovering over reaction with users', async () => {
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockWithSession);

    // Create a test renderer with pointer events
    render(
      <SessionProvider session={mockSession}>
        <QuickReactions postId="123" />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Use context menu to trigger the user list display
    const loveButton = screen.getByTitle('Love');
    fireEvent.contextMenu(loveButton);

    // Check that the user list is now visible
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('handles long press on mobile devices', async () => {
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockWithSession);

    render(
      <SessionProvider session={mockSession}>
        <QuickReactions postId="123" />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Simulate touchStart event
    const loveButton = screen.getByTitle('Love');
    fireEvent.touchStart(loveButton);

    // Fast-forward timers to trigger long press
    act(() => {
      jest.advanceTimersByTime(600); // More than the 500ms threshold
    });

    // Check that the user list is visible after long press
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Touch end should clear the timeout
    fireEvent.touchEnd(loveButton);
  });

  it('handles fetch errors gracefully', async () => {
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockWithSession);

    // Mock console.error to silence it during the test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock a failed fetch
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

    render(
      <SessionProvider session={mockSession}>
        <QuickReactions postId="123" />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching reactions:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('shows reaction picker for authenticated users when no reactions exist', async () => {
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockWithSession);

    // Mock a response with no reactions
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        reactions: [
          { type: 'LOVE', count: 0, users: [] },
          { type: 'YUM', count: 0, users: [] },
          { type: 'WANT_TO_TRY', count: 0, users: [] },
          { type: 'MADE_IT', count: 0, users: [] },
          { type: 'FAVORITE', count: 0, users: [] }
        ],
        userReactions: []
      })
    });

    render(
      <SessionProvider session={mockSession}>
        <QuickReactions postId="123" />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-reactions')).not.toBeInTheDocument();
    });

    // Should show "React" button when there are no reactions
    expect(screen.getByText('React')).toBeInTheDocument();

    // Click the button to show the reaction picker
    fireEvent.click(screen.getByText('React'));

    // Reaction picker should be visible
    await waitFor(() => {
      expect(screen.getAllByTitle('Love')[0]).toBeInTheDocument();
      expect(screen.getAllByTitle('Yum')[0]).toBeInTheDocument();
      expect(screen.getAllByTitle('Want to try')[0]).toBeInTheDocument();
      expect(screen.getAllByTitle('Made it')[0]).toBeInTheDocument();
      expect(screen.getAllByTitle('Favorite')[0]).toBeInTheDocument();
    });
  });
});
