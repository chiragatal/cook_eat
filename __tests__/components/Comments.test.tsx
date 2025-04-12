import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
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
    href: 'https://cook-eat-preview.vercel.app/recipe/123',
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
    expect(screen.getByText(newComment)).toBeInTheDocument();

    // Input should be cleared
    expect(commentInput).toHaveValue('');
  });

  it('allows editing a comment by the comment owner', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [...mockComments] }) // Initial comments fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockComments[0],
          content: 'Edited comment content',
          updatedAt: '2023-01-04T12:00:00Z'
        })
      }); // Comment update

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Find the edit button for the first comment (user is the owner)
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBeGreaterThan(0);

    // Click edit
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    // Check if we're in edit mode
    const editTextarea = screen.getByDisplayValue('This is a test comment');
    expect(editTextarea).toBeInTheDocument();

    // Change the comment content
    await act(async () => {
      fireEvent.change(editTextarea, { target: { value: 'Edited comment content' } });
    });

    // Save the edit
    const saveButton = screen.getByText('Save');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Verify fetch was called with the right arguments
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/comments?commentId=comment-1`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content: 'Edited comment content' }),
        })
      );
    });

    // Comment content should be updated
    expect(screen.getByText('Edited comment content')).toBeInTheDocument();
  });

  it('allows canceling comment editing', async () => {
    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Find the edit button for the first comment
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBeGreaterThan(0);

    // Click edit
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    // Check if we're in edit mode
    const editTextarea = screen.getByDisplayValue('This is a test comment');
    expect(editTextarea).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    // Should exit edit mode without changing the comment
    expect(screen.queryByDisplayValue('This is a test comment')).not.toBeInTheDocument();
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });

  it('allows deleting a comment by the comment owner', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [...mockComments] }) // Initial comments fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // Comment deletion

    // Mock confirm to return true (user confirms deletion)
    (global.confirm as jest.Mock).mockReturnValue(true);

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Find the delete button for the first comment
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Click delete
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    // Confirmation should be shown
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this comment?');

    // Verify fetch was called with the right arguments
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${mockPostId}/comments?commentId=comment-1`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    // Comment should be removed from the list
    expect(screen.queryByText('This is a test comment')).not.toBeInTheDocument();
    // But other comments should remain
    expect(screen.getByText('Another test comment')).toBeInTheDocument();
  });

  it('does not delete a comment if confirmation is canceled', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [...mockComments] }); // Initial comments fetch

    // Mock confirm to return false (user cancels deletion)
    (global.confirm as jest.Mock).mockReturnValue(false);

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Find the delete button for the first comment
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Click delete
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    // Confirmation should be shown
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this comment?');

    // Fetch should not be called for deletion
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining(`/api/posts/${mockPostId}/comments?commentId=`),
      expect.objectContaining({ method: 'DELETE' })
    );

    // Comments should remain unchanged
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    expect(screen.getByText('Another test comment')).toBeInTheDocument();
  });

  it('disables the comment form while submitting', async () => {
    // Delay the resolution to test loading state
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [...mockComments] }) // Initial comments fetch
      .mockImplementationOnce(() => new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              id: 'comment-3',
              content: 'New comment',
              createdAt: '2023-01-03T12:00:00Z',
              updatedAt: '2023-01-03T12:00:00Z',
              userId: 'user-1',
              postId: mockPostId,
              user: {
                name: 'Test User',
                email: 'test@example.com',
              },
            })
          });
        }, 100);
      }));

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Type a comment
    const commentInput = screen.getByPlaceholderText('Add a comment...');
    await act(async () => {
      fireEvent.change(commentInput, { target: { value: 'New comment' } });
    });

    // Submit the form
    const submitButton = screen.getByText('Post Comment');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Button should change to loading state and be disabled
    expect(screen.getByText('Posting...')).toBeInTheDocument();
    expect(screen.getByText('Posting...')).toBeDisabled();

    // Textarea should be disabled
    expect(commentInput).toBeDisabled();

    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText('Post Comment')).toBeInTheDocument();
    });
  });

  it('shows error message when comment submission fails', async () => {
    // Mock fetch to fail for comment submission
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [...mockComments] }) // Initial comments fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Failed to create comment' })
      }); // Comment submission failure

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Type a comment
    const commentInput = screen.getByPlaceholderText('Add a comment...');
    await act(async () => {
      fireEvent.change(commentInput, { target: { value: 'New comment' } });
    });

    // Submit the form
    const submitButton = screen.getByText('Post Comment');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Error message should be displayed
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to create comment/)).toBeInTheDocument();
    });

    // The form should still have the entered comment
    expect(commentInput).toHaveValue('New comment');
  });

  it('shows error message when comments cannot be loaded', async () => {
    // Mock fetch to fail for initial comments fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Failed to fetch comments' })
    });

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    // Error message should be displayed
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch comments/)).toBeInTheDocument();
    });

    // Should not be in loading state anymore
    expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
  });

  it('shows no comments message when there are no comments', async () => {
    // Mock empty comments array
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // Should show no comments message
    expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
  });

  it('only shows edit and delete buttons for the comment owner', async () => {
    await act(async () => {
      render(<Comments postId={mockPostId} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    });

    // The session user owns the first comment but not the second
    const editButtons = screen.getAllByText('Edit');
    const deleteButtons = screen.getAllByText('Delete');

    // Should only be able to edit/delete their own comments
    expect(editButtons.length).toBe(1);
    expect(deleteButtons.length).toBe(1);

    // First comment should have edit/delete buttons visible
    const firstComment = screen.getByText('This is a test comment');
    const firstCommentContainer = firstComment.closest('[data-testid="comment-container"]') as HTMLElement;

    // Add data-testid to make selection more reliable
    if (firstCommentContainer) {
      expect(within(firstCommentContainer).getByText('Edit')).toBeInTheDocument();
      expect(within(firstCommentContainer).getByText('Delete')).toBeInTheDocument();
    } else {
      // Fallback to just checking that the buttons exist somewhere
      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    }

    // Second comment should NOT have edit/delete buttons
    const secondComment = screen.getByText('Another test comment');
    const secondCommentContainer = secondComment.closest('[data-testid="comment-container"]') as HTMLElement;

    if (secondCommentContainer) {
      expect(within(secondCommentContainer).queryByText('Edit')).not.toBeInTheDocument();
      expect(within(secondCommentContainer).queryByText('Delete')).not.toBeInTheDocument();
    }
  });
});
