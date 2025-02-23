'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Reaction {
  type: string;
  count: number;
}

interface RecipeReactionsProps {
  postId: number;
}

const REACTION_EMOJIS: Record<string, { emoji: string; label: string }> = {
  LOVE: { emoji: '❤️', label: 'Love' },
  YUM: { emoji: '😋', label: 'Yum' },
  WANT_TO_TRY: { emoji: '🔖', label: 'Want to try' },
  MADE_IT: { emoji: '👩‍🍳', label: 'Made it' },
  FAVORITE: { emoji: '⭐', label: 'Favorite' },
};

export default function RecipeReactions({ postId }: RecipeReactionsProps) {
  const { data: session } = useSession();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReactions();
  }, [postId]);

  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`);
      if (!response.ok) throw new Error('Failed to fetch reactions');
      const data = await response.json();
      setReactions(data.reactions);
      setUserReactions(data.userReactions);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = async (type: string) => {
    if (!session) {
      // Optionally show a login prompt
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) throw new Error('Failed to toggle reaction');

      const data = await response.json();
      setReactions(data.reactions);
      setUserReactions(data.userReactions);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(REACTION_EMOJIS).map(([type, { emoji, label }]) => {
        const reaction = reactions.find(r => r.type === type);
        const count = reaction?.count || 0;
        const hasReacted = userReactions.includes(type);

        return (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            className={`
              inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm
              transition-colors duration-200
              ${hasReacted
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              ${!session && 'opacity-50 cursor-not-allowed'}
            `}
            disabled={!session}
            title={session ? undefined : 'Sign in to react'}
          >
            <span>{emoji}</span>
            <span>{label}</span>
            {count > 0 && (
              <span className="ml-1 font-medium">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
