'use client';

import { useState } from 'react';
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import Calendar from './components/Calendar';
import Link from 'next/link';

export default function Home() {
  const [key, setKey] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleRecipeCreated = async (recipe: any) => {
    try {
      setError(null);
      console.log('Creating recipe:', recipe);

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

      console.log('Recipe created successfully:', data);
      setKey(prev => prev + 1);
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating recipe:', error);
      setError(error instanceof Error ? error.message : 'Failed to create recipe');
    }
  };

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-[1200px] mx-auto px-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold">Cook & Eat</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/calendar"
              className="px-4 py-2 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View Calendar
            </Link>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Create New Recipe
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <h2 className="text-2xl font-bold mb-6">Your Recipes</h2>
            <RecipeList key={key} />
          </div>
          <div className="lg:col-span-4">
            <Calendar onDateSelect={setSelectedDate} />
          </div>
        </div>
      </div>
    </div>
  );
}
