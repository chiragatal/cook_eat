import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Comments from '@/app/components/Comments';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(),
}));

// Mock the CommentReactions component to simplify testing
jest.mock('@/app/components/CommentReactions', () => {
  const MockCommentReactions = ({ commentId }: { commentId: string }) => (
    <div data-testid={`comment-reactions-${commentId}`}>Comment Reactions</div>
  );
  MockCommentReactions.displayName = 'MockCommentReactions';
  return MockCommentReactions;
});

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.location.href for the sign-in link
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/recipe/123',
  },
  writable: true,
});

// Mock confirm global function
global.confirm = jest.fn();

describe('Comments Component', () => {
  const mockPostId = 'post-123';

  // Mock comments data
  const mockComments = [
    {
      id: 'comment-1',
      content: 'This is a test comment',
      createdAt: '2023-01-01T12:00:00Z',
      updatedAt: '2023-01-01T12:00:00Z',
      userId: 'user-1',
      postId: mockPostId,
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
    },
    {
      id: 'comment-2',
      content: 'Another test comment',
      createdAt: '2023-01-02T12:00:00Z',
      updatedAt: '2023-01-02T12:00:00Z',
      userId: 'user-2',
      postId: mockPostId,
      user: {
        name: 'Another User',
        email: 'another@example.com',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch response for comments - ensure it returns an array
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [...mockComments],
    });

    // Mock authenticated session by default
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      },
      status: 'authenticated',
    });

    // Mock formatDistanceToNow function
    (formatDistanceToNow as jest.Mock).mockReturnValue('2 days ago');
  });

  it('renders loading state initially', async () => {
    render(<Comments postId={mockPostId} />);
    expect(screen.getByText('Loading comments...')).toBeInTheDocument();
  });

  it('fetches and displays comments on mount', async () => {
    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    // Check that fetch was called with correct URL
    expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPostId}/comments`);

    // Wait for comments to load
    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Check that comments are displayed
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    expect(screen.getByText('Another test comment')).toBeInTheDocument();

    // User names should be shown
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Another User')).toBeInTheDocument();

    // Dates should be formatted
    expect(screen.getAllByText('2 days ago').length).toBe(2);

    // Each comment should have a reaction component
    expect(screen.getByTestId('comment-reactions-comment-1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-reactions-comment-2')).toBeInTheDocument();
  });

  it('shows a sign-in message when user is not authenticated', async () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Should show sign-in message - match the actual text in the component
    const signInText = screen.getByText('sign in');
    expect(signInText).toBeInTheDocument();
    expect(signInText.closest('p')?.textContent).toContain('Please sign in to leave a comment');

    // Should not show comment form
    expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
  });

  it('allows submitting a new comment', async () => {
    const newComment = 'This is a new comment';
    const createdComment = {
      id: 'comment-3',
      content: newComment,
      createdAt: '2023-01-03T12:00:00Z',
      updatedAt: '2023-01-03T12:00:00Z',
      userId: 'user-1',
      postId: mockPostId,
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    // Make sure both responses return arrays
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [...mockComments] }) // Initial comments fetch
      .mockResolvedValueOnce({ ok: true, json: async () => createdComment }); // Comment creation

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Type a new comment
    const commentInput = screen.getByPlaceholderText('Add a comment...');
    await act(async () => {
      fireEvent.change(commentInput, { target: { value: newComment } });
    });

    // Submit the form
    const submitButton = screen.getByText('Post Comment');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify that fetch was called with the right arguments
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/comments`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: newComment }),
        })
      );
    });

    // Should add the new comment to the list
    await waitFor(() => {
      expect(screen.getByText(newComment)).toBeInTheDocument();
    });
  });

  it('allows editing a comment made by the current user', async () => {
    const updatedComment = 'Updated comment content';
    const editedComment = {
      ...mockComments[0],
      content: updatedComment,
      updatedAt: '2023-01-03T12:00:00Z',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [...mockComments] }) // Initial comments fetch
      .mockResolvedValueOnce({ ok: true, json: async () => editedComment }); // Comment update

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Find edit button on the first comment (which is by the current user)
    const editButton = screen.getByText('Edit');
    await act(async () => {
      fireEvent.click(editButton);
    });

    // Edit input should be visible with the current comment content
    const editInput = screen.getByDisplayValue('This is a test comment');
    await act(async () => {
      fireEvent.change(editInput, { target: { value: updatedComment } });
    });

    // Submit the edit - use the correct button text
    const updateButton = screen.getByText('Save');
    await act(async () => {
      fireEvent.click(updateButton);
    });

    // Verify that fetch was called with the right arguments
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/comments?commentId=comment-1`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content: updatedComment }),
        })
      );
    });

    // Updated comment should be displayed
    await waitFor(() => {
      expect(screen.getByText(updatedComment)).toBeInTheDocument();
    });
  });

  it('allows canceling an edit', async () => {
    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    const originalText = 'This is a test comment';

    // Start editing
    const editButton = screen.getByText('Edit');
    await act(async () => {
      fireEvent.click(editButton);
    });

    // Change input value
    const editInput = screen.getByDisplayValue(originalText);
    await act(async () => {
      fireEvent.change(editInput, { target: { value: 'Changed text' } });
    });

    // Cancel the edit
    const cancelButton = screen.getByText('Cancel');
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    // Original text should still be shown
    expect(screen.getByText(originalText)).toBeInTheDocument();

    // Edit input should not be visible
    expect(screen.queryByDisplayValue('Changed text')).not.toBeInTheDocument();
  });

  it('allows deleting a comment', async () => {
    (global.confirm as jest.Mock).mockReturnValue(true);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [...mockComments] }) // Initial comments fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // Delete response

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Get delete button for the first comment
    const deleteButton = screen.getByText('Delete');

    // Click delete
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Verify confirmation was shown
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this comment?');

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/posts/${mockPostId}/comments?commentId=comment-1`,
      expect.objectContaining({
        method: 'DELETE',
      })
    );

    // First comment should be removed
    await waitFor(() => {
      expect(screen.queryByText('This is a test comment')).not.toBeInTheDocument();
    });

    // Second comment should still be visible
    expect(screen.getByText('Another test comment')).toBeInTheDocument();
  });

  it('shows a message when there are no comments', async () => {
    // Mock empty comments array
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Should show no-comments message
    expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument();
  });
});
