'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function TestComments() {
  const { data: session } = useSession();
  const [postId, setPostId] = useState('15');
  const [content, setContent] = useState('Test comment');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestGet = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();

      setResult({
        status: res.status,
        data
      });
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPost = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      setResult({
        status: res.status,
        data
      });
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-6">Test Comments API</h1>

      {!session && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md">
          You are not logged in. POST requests will fail.
        </div>
      )}

      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Post ID:</label>
        <input
          type="text"
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
          className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Comment Content:</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          rows={3}
        />
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleTestGet}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Test GET
        </button>
        <button
          onClick={handleTestPost}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Test POST
        </button>
      </div>

      {loading && <div className="text-center">Loading...</div>}

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-auto">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
