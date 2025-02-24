'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useView } from '../contexts/ViewContext';
import { useSearchParams } from 'next/navigation';
import RecipeForm from './RecipeForm';
import RecipeList from './RecipeList';
import Calendar from './Calendar';

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">
          {selectedUserId
            ? `${selectedUserName}'s Recipes`
            : (isMyRecipesView ? 'Your Recipes' : 'All Public Recipes')}
        </h2>
        {session && (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm font-medium"
          >
            Create New Recipe
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
        <div className="lg:col-span-4 order-1 lg:order-2 hidden lg:sticky lg:top-4 lg:block">
          <Calendar onDateSelect={setSelectedDate} />
        </div>
        <div className="block lg:hidden order-1 mb-4">
          <Calendar onDateSelect={setSelectedDate} />
        </div>
        <div className="lg:col-span-8 order-2 lg:order-1">
          <RecipeList
            key={key}
            userId={selectedUserId ? selectedUserId : (isMyRecipesView && session?.user?.id ? session.user.id.toString() : undefined)}
            showPrivate={Boolean(isMyRecipesView || (selectedUserId && parseInt(selectedUserId) === session?.user?.id))}
            publicOnly={Boolean(!isMyRecipesView && (!selectedUserId || parseInt(selectedUserId) !== session?.user?.id))}
            selectedDate={selectedDate}
            filterByDate={Boolean(selectedDate)}
          />
        </div>
      </div>
    </>
  );
}
