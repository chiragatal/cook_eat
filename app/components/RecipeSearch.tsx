'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface SearchFilters {
  query: string;
  category: string;
  visibility: 'all' | 'public' | 'private';
  reactionFilter: string;
}

interface RecipeSearchProps {
  onSearch: (filters: SearchFilters) => void;
}

const CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Snack',
  'Beverage',
  'Other'
];

const REACTION_FILTERS = [
  { value: 'FAVORITE', emoji: '⭐', label: 'My Favorites' },
  { value: 'WANT_TO_TRY', emoji: '🔖', label: 'Want to Try' },
  { value: 'MADE_IT', emoji: '👩‍🍳', label: 'Made These' },
];

export default function RecipeSearch({ onSearch }: RecipeSearchProps) {
  const { data: session } = useSession();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    visibility: 'all',
    reactionFilter: '',
  });

  useEffect(() => {
    onSearch(filters);
  }, [filters, onSearch]);

  const handleReactionFilter = (value: string) => {
    setFilters(prev => ({
      ...prev,
      reactionFilter: prev.reactionFilter === value ? '' : value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by title, ingredients, tags, or category..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              id="visibility"
              value={filters.visibility}
              onChange={(e) => setFilters({ ...filters, visibility: e.target.value as 'all' | 'public' | 'private' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Recipes</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
          </div>
        </div>

        {session && (
          <div className="flex flex-wrap gap-2">
            {REACTION_FILTERS.map(({ value, emoji, label }) => (
              <button
                key={value}
                onClick={() => handleReactionFilter(value)}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  transition-colors duration-200
                  ${filters.reactionFilter === value
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
