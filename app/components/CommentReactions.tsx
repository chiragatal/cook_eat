'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { COMMENT_REACTION_TYPES, CommentReactionType } from '../api/comments/[id]/reactions/types';

interface Reaction {
  type: CommentReactionType;
  count: number;
  users?: Array<{
    id: string;
    name: string | null;
  }>;
}

interface CommentReactionsProps {
  commentId: string;
  onReactionToggled?: () => void;
}

const REACTION_EMOJIS: Record<CommentReactionType, { emoji: string; label: string }> = {
  LIKE: { emoji: '👍', label: 'Like' },
  LOVE: { emoji: '❤️', label: 'Love' },
  LAUGH: { emoji: '😂', label: 'Laugh' },
  INSIGHTFUL: { emoji: '💡', label: 'Insightful' },
  HELPFUL: { emoji: '🙏', label: 'Helpful' },
};

export default function CommentReactions({ commentId, onReactionToggled }: CommentReactionsProps) {
  const { data: session } = useSession();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [activeLongPressType, setActiveLongPressType] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchReactions();
  }, [commentId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
        setActiveLongPressType(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    };
  }, []);

  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/comments/${commentId}/reactions`);
      if (!response.ok) throw new Error('Failed to fetch reactions');
      const data = await response.json();
      setReactions(data.reactions || []);
      setUserReactions(data.userReactions || []);
    } catch (error) {
      console.error('Error fetching comment reactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = async (type: string) => {
    if (!session) return;

    try {
      const response = await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) throw new Error('Failed to toggle reaction');

      const data = await response.json();
      setReactions(data.reactions || []);
      setUserReactions(data.userReactions || []);
      setShowReactionPicker(false);
      onReactionToggled?.();
    } catch (error) {
      console.error('Error toggling comment reaction:', error);
    }
  };

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

  if (isLoading) {
    return <div data-testid="loading-indicator" className="animate-pulse h-5 w-16 bg-gray-200 rounded" />;
  }

  // Filter out reactions with count 0
  const activeReactions = reactions.filter(r => r.count > 0);

  if (activeReactions.length === 0 && !showReactionPicker) {
    return session ? (
      <div ref={containerRef} className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={() => setShowReactionPicker(true)}
          className="text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          React
        </button>

        {showReactionPicker && (
          <div
            ref={pickerRef}
            className="absolute left-0 bottom-full mb-1 bg-white rounded-lg shadow-lg p-1 border border-gray-200 z-50"
          >
            <div className="flex gap-1">
              {Object.entries(REACTION_EMOJIS).map(([type, { emoji, label }]) => (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  title={label}
                >
                  <span className="text-sm">{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    ) : null;
  }

  return (
    <div ref={containerRef} className="inline-flex items-center gap-1">
      <div className="flex flex-wrap gap-1">
        {activeReactions.map(reaction => (
          <div key={reaction.type} className="relative group">
            <button
              onClick={() => session && handleReaction(reaction.type)}
              onContextMenu={(e) => reaction.users && reaction.users.length > 0 && handleLongPress(reaction.type, e)}
              onTouchStart={() => reaction.users && reaction.users.length > 0 && handleTouchStart(reaction.type)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={`
                inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs
                transition-colors duration-200
                ${userReactions.includes(reaction.type) ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'}
                ${session ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}
                ${activeLongPressType === reaction.type ? 'ring-2 ring-blue-400' : ''}
              `}
              title={`${REACTION_EMOJIS[reaction.type as CommentReactionType].label}${!session ? ' - Sign in to react' : ''}`}
            >
              <span>{REACTION_EMOJIS[reaction.type as CommentReactionType].emoji}</span>
              <span className="text-xs font-medium">{reaction.count}</span>
            </button>

            {/* User list tooltip - shown on hover for desktop and on long press for mobile */}
            {reaction.users && reaction.users.length > 0 && (
              <div className={`
                absolute z-50 mb-2
                bg-white dark:bg-gray-800 rounded-md shadow-lg p-2 text-xs
                min-w-[120px] max-w-[200px] border border-gray-200 dark:border-gray-700
                ${activeLongPressType === reaction.type
                  ? 'visible opacity-100'
                  : 'invisible group-hover:visible opacity-0 group-hover:opacity-100 md:block hidden'}
                transition-all duration-200
                transform origin-bottom

                ${/* Position towards the left on all screen sizes */ ''}
                left-0 bottom-full

                ${/* Prevent going beyond edge of screen */ ''}
                min-w-0 w-auto
              `}
              style={{
                maxHeight: 'calc(90vh - 200px)',
                maxWidth: 'calc(100vw - 16px)'
              }}>
                <div className="font-medium px-2 py-1 border-b border-gray-200 dark:border-gray-700 mb-1 text-gray-700 dark:text-gray-300 sticky top-0 bg-white dark:bg-gray-800 z-10">
                  {REACTION_EMOJIS[reaction.type as CommentReactionType].label} • {reaction.count}
                </div>
                <div className={`${reaction.users.length > 5 ? 'overflow-y-auto' : ''}`} style={{ maxHeight: reaction.users.length > 5 ? 'calc(90vh - 240px)' : 'auto' }}>
                  {reaction.users.map(user => (
                    <div key={user.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 flex-shrink-0">
                        {user.name?.charAt(0) || '?'}
                      </div>
                      <span className="truncate text-gray-800 dark:text-gray-200">{user.name || 'Anonymous User'}</span>
                    </div>
                  ))}
                </div>

                {/* Triangle pointer */}
                <div className="absolute -bottom-2 left-4 w-0 h-0
                  border-l-[8px] border-l-transparent
                  border-r-[8px] border-r-transparent
                  border-t-[8px] border-t-white dark:border-t-gray-800"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {session && (
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>

          {showReactionPicker && (
            <div
              ref={pickerRef}
              className="absolute left-0 bottom-full mb-1 bg-white rounded-lg shadow-lg p-1 border border-gray-200 z-50"
            >
              <div className="flex gap-1">
                {Object.entries(REACTION_EMOJIS).map(([type, { emoji, label }]) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    className={`
                      p-1 rounded hover:bg-gray-100 transition-colors
                      ${userReactions.includes(type) ? 'bg-blue-50' : ''}
                    `}
                    title={label}
                  >
                    <span className="text-sm">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
