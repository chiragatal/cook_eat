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
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search recipes..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base sm:text-sm h-12 sm:h-10"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base sm:text-sm h-12 sm:h-10"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {session && (
            <div>
              <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <select
                id="visibility"
                value={filters.visibility}
                onChange={(e) => setFilters({ ...filters, visibility: e.target.value as 'all' | 'public' | 'private' })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base sm:text-sm h-12 sm:h-10"
              >
                <option value="all">All Recipes</option>
                <option value="public">Public Only</option>
                <option value="private">Private Only</option>
              </select>
            </div>
          )}

          {session && (
            <div>
              <label htmlFor="reactionFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Quick Filters
              </label>
              <select
                id="reactionFilter"
                value={filters.reactionFilter}
                onChange={(e) => setFilters({ ...filters, reactionFilter: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base sm:text-sm h-12 sm:h-10"
              >
                <option value="">All Recipes</option>
                {REACTION_FILTERS.map(filter => (
                  <option key={filter.value} value={filter.value}>{`${filter.emoji} ${filter.label}`}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
