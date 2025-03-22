'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { REACTION_TYPES, ReactionType } from '../api/posts/[id]/reactions/types';

interface Reaction {
  type: ReactionType;
  count: number;
  users?: Array<{
    id: number;
    name: string | null;
  }>;
}

interface RecipeReactionsProps {
  postId: number;
  onReactionToggled?: () => void;
}

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; label: string }> = {
  LOVE: { emoji: '❤️', label: 'Love' },
  YUM: { emoji: '😋', label: 'Yum' },
  WANT_TO_TRY: { emoji: '🔖', label: 'Want to try' },
  MADE_IT: { emoji: '👩‍🍳', label: 'Made it' },
  FAVORITE: { emoji: '⭐', label: 'Favorite' },
};

export default function RecipeReactions({ postId, onReactionToggled }: RecipeReactionsProps) {
  const { data: session } = useSession();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLongPressType, setActiveLongPressType] = useState<string | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchReactions();
  }, [postId]);

  // Handle clicks outside to close the long-press popup
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeLongPressType) {
        setActiveLongPressType(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    };
  }, [activeLongPressType]);

  const handleLongPress = (type: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveLongPressType(prev => prev === type ? null : type);
  };

  const handleTouchStart = (type: string) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    longPressTimeoutRef.current = setTimeout(() => {
      setActiveLongPressType(type);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

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
      onReactionToggled?.();
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
        const users = reaction?.users || [];
        const isActiveLongPress = activeLongPressType === type;

        return (
          <div key={type} className="relative group">
            <button
              onClick={() => handleReaction(type)}
              onContextMenu={(e) => users.length > 0 && handleLongPress(type, e)}
              onTouchStart={() => users.length > 0 && handleTouchStart(type)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={`
                inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm
                transition-colors duration-200
                ${hasReacted
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${!session && 'opacity-50 cursor-not-allowed'}
                ${isActiveLongPress ? 'ring-2 ring-blue-400' : ''}
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

            {/* User list tooltip - shown on hover for desktop and on long press for mobile */}
            {count > 0 && users.length > 0 && (
              <div className={`
                absolute z-50 mb-2
                bg-white dark:bg-gray-800 rounded-md shadow-lg p-2 text-sm
                min-w-[150px] max-w-[250px] border border-gray-200 dark:border-gray-700
                ${isActiveLongPress
                  ? 'visible opacity-100'
                  : 'invisible group-hover:visible opacity-0 group-hover:opacity-100 md:block hidden'}
                transition-all duration-200
                transform origin-bottom

                ${/* Position towards the right on all screen sizes */ ''}
                right-0 bottom-full

                ${/* Prevent going beyond edge of screen */ ''}
                min-w-0 w-auto
              `}
              style={{
                maxHeight: 'calc(90vh - 200px)',
                maxWidth: 'calc(100vw - 16px)'
              }}>
                <div className="font-medium px-2 py-1 border-b border-gray-200 dark:border-gray-700 mb-1 text-gray-700 dark:text-gray-300 sticky top-0 bg-white dark:bg-gray-800 z-10">
                  {label} • {count}
                </div>
                <div className={`${users.length > 5 ? 'overflow-y-auto' : ''}`} style={{ maxHeight: users.length > 5 ? 'calc(90vh - 240px)' : 'auto' }}>
                  {users.map(user => (
                    <div key={user.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 flex-shrink-0">
                        {user.name?.charAt(0) || '?'}
                      </div>
                      <span className="truncate text-gray-800 dark:text-gray-200">{user.name || 'Anonymous User'}</span>
                    </div>
                  ))}
                </div>

                {/* Triangle pointer */}
                <div className="absolute -bottom-2 right-4 w-0 h-0
                  border-l-[8px] border-l-transparent
                  border-r-[8px] border-r-transparent
                  border-t-[8px] border-t-white dark:border-t-gray-800"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
