'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import CommentReactions from './CommentReactions';

interface User {
  name: string | null;
  email: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  postId: string;
  user: User;
}

export default function Comments({ postId }: { postId: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/posts/${postId}/comments`);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        setComments(data);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setError(error instanceof Error ? error.message : 'Failed to load comments');
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [postId]);

  // Submit new comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      alert('You must be logged in to comment');
      return;
    }

    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`);
      }

      const comment = await res.json();
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Start editing a comment
  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // Update a comment
  const updateComment = async (id: string) => {
    if (!editContent.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/posts/${postId}/comments?commentId=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (!res.ok) throw new Error('Failed to update comment');

      const updatedComment = await res.json();
      setComments(comments.map(c => c.id === id ? updatedComment : c));
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a comment
  const deleteComment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments?commentId=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete comment');

      setComments(comments.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mx-auto max-w-4xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Comments</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md">
          Error: {error}
        </div>
      )}

      {session ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <textarea
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="text-right">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6 text-center">
          <p>Please <a href={`/api/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`} className="text-blue-600 dark:text-blue-400 hover:underline">sign in</a> to leave a comment.</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">
          <p>Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-start">
                  <div className="mr-3 bg-gray-200 dark:bg-gray-600 rounded-full h-10 w-10 flex items-center justify-center">
                    <span className="text-gray-700 dark:text-gray-200 font-medium">
                      {comment.user.name ? comment.user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {comment.user.name || 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(comment.createdAt)}
                    </p>
                  </div>
                </div>

                {session && (session.user.id === comment.userId || session.user.isAdmin) && (
                  <div className="flex space-x-2">
                    {editingId !== comment.id && (
                      <>
                        <button
                          onClick={() => startEdit(comment)}
                          className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {editingId === comment.id ? (
                <div className="mt-2">
                  <textarea
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    disabled={submitting}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateComment(comment.id)}
                      disabled={submitting || !editContent.trim()}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.content}
                </div>
              )}
              <div className="mt-2">
                <CommentReactions commentId={comment.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
