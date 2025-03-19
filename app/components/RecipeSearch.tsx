'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CATEGORIES, REACTION_FILTERS, Category } from '../lib/constants';

interface SearchFilters {
  query: string;
  category: Category | '';
  visibility: 'all' | 'public' | 'private';
  reactionFilter: string;
}

interface RecipeSearchProps {
  onSearch: (filters: SearchFilters) => void;
}

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search recipes
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search recipes..."
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base sm:text-sm h-12 sm:h-10 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              id="category"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value as Category | '' })}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base sm:text-sm h-12 sm:h-10"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {session && (
            <div>
              <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Visibility
              </label>
              <select
                id="visibility"
                value={filters.visibility}
                onChange={(e) => setFilters({ ...filters, visibility: e.target.value as 'all' | 'public' | 'private' })}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base sm:text-sm h-12 sm:h-10"
              >
                <option value="all">All Recipes</option>
                <option value="public">Public Only</option>
                <option value="private">Private Only</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {REACTION_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleReactionFilter(filter.value)}
              className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                filters.reactionFilter === filter.value
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {filter.emoji} {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
