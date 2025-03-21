'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RecipeForm from '../../../components/RecipeForm';
import Navigation from '../../../components/Navigation';
import { Recipe } from '../../../types';

export default function EditRecipePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const response = await fetch(`/api/posts?id=${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recipe');
        }
        const data = await response.json();
        setRecipe(data);
      } catch (error) {
        console.error('Error fetching recipe:', error);
        setError('Failed to fetch recipe');
      } finally {
        setLoading(false);
      }
    };

    if (status !== 'loading') {
      fetchRecipe();
    }
  }, [params.id, status]);

  useEffect(() => {
    // Redirect if not authenticated or not the recipe owner
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (recipe && session && recipe.userId !== session.user.id && !session.user.isAdmin) {
      router.push(`/recipe/${params.id}`);
      setError('You do not have permission to edit this recipe');
    }
  }, [recipe, session, status, router, params.id]);

  const handleSave = async (updatedRecipe: Partial<Recipe>) => {
    try {
      const response = await fetch(`/api/posts?id=${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecipe),
      });

      if (!response.ok) {
        throw new Error('Failed to update recipe');
      }

      router.push(`/recipe/${params.id}`);
    } catch (error) {
      console.error('Error updating recipe:', error);
      setError('Failed to update recipe');
    }
  };

  const handleCancel = () => {
    router.push(`/recipe/${params.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Navigation />
          <div className="mt-8 flex justify-center">
            <p className="text-gray-600 dark:text-gray-400">Loading recipe...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Navigation />
          <div className="mt-8">
            <div className="bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 p-4 rounded-md">
              {error || 'Recipe not found'}
            </div>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Navigation />
        <div className="mt-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Recipe: {recipe.title}</h1>
          <RecipeForm
            recipe={recipe}
            mode="edit"
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
