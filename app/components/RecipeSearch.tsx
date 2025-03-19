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
  onSearch?: (filters: SearchFilters) => void;
}

export default function RecipeSearch({ onSearch = () => {} }: RecipeSearchProps) {
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
      reactionFilter: prev.reactionFilter === value ? '' : value,
    }));
  };

  const handleFilter = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Search recipes</h2>
      <div className="space-y-4">
        <div>
          <input
            type="text"
            id="search"
            placeholder="Search recipes..."
            value={filters.query}
            onChange={(e) => handleFilter('query', e.target.value)}
            className="mt-1 h-12 sm:h-10 block w-full text-base sm:text-sm rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tip: Click on a recipe card to see ingredients. Click directly on the title to view the full recipe.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Filters
          </label>
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
    </div>
  );
}
