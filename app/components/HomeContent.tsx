'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useView } from '../contexts/ViewContext';
import { useSearchParams } from 'next/navigation';
import RecipeForm from './RecipeForm';
import RecipeList from './RecipeList';
import RecipeSearch from './RecipeSearch';
import Calendar from './Calendar';
import Link from 'next/link';
import { Suspense } from 'react';

export default function HomeContent() {
  const { data: session } = useSession();
  const { isMyRecipesView, selectedUserId, selectedUserName, setSelectedUser } = useView();
  const [key, setKey] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const searchParams = useSearchParams();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const userParam = searchParams.get('user');
    if (!userParam) {
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
      return;
    }

    // Skip if we already have this user selected
    if (userParam === selectedUserId || !isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    // Fetch user details to get the name
    fetch(`/api/users/search?q=${userParam}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch user details');
        return res.json();
      })
      .then(users => {
        if (users && users.length > 0) {
          // Find the exact user by ID
          const user = users.find((u: any) => u.id.toString() === userParam);
          if (user) {
            setSelectedUser(userParam, user.name || user.email);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching user details:', err);
        setSelectedUser(null, null);
      })
      .finally(() => {
        setIsInitialLoad(false);
      });
  }, [searchParams, setSelectedUser, isInitialLoad, selectedUserId]);

  const handleRecipeCreated = async (recipe: any) => {
    try {
      setError(null);
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipe),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create recipe');
      }

      setKey(prev => prev + 1);
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating recipe:', error);
      setError(error instanceof Error ? error.message : 'Failed to create recipe');
    }
  };

  if (isCreating) {
    return (
      <div className="max-w-[1200px] mx-auto">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg">
            {error}
          </div>
        )}
        <RecipeForm
          mode="create"
          onSave={handleRecipeCreated}
          onCancel={() => {
            setIsCreating(false);
            setError(null);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isMyRecipesView ? 'My Recipes' : 'All Public Recipes'}
        </h1>
        {session && (
          <Link
            href="/recipes/new"
            className="inline-flex items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
          >
            Create New Recipe
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
              </div>
            }
          >
            <RecipeList
              key={key}
              userId={selectedUserId ? selectedUserId : (isMyRecipesView && session?.user?.id ? session.user.id.toString() : undefined)}
              showPrivate={Boolean(isMyRecipesView || (selectedUserId && parseInt(selectedUserId) === session?.user?.id))}
              publicOnly={Boolean(!isMyRecipesView && (!selectedUserId || parseInt(selectedUserId) !== session?.user?.id))}
              selectedDate={selectedDate}
              filterByDate={Boolean(selectedDate)}
            />
          </Suspense>
        </div>

        <div className="lg:order-2">
          <div className="sticky lg:top-4 order-1 mb-4 lg:mb-0">
            <Calendar onDateSelect={setSelectedDate} />
          </div>
        </div>
      </div>
    </>
  );
}
