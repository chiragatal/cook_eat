'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useView } from '../../contexts/ViewContext';

interface Ingredient {
  name: string;
  amount: string;
}

interface Step {
  instruction: string;
  id: string;
}

interface Recipe {
  id: number;
  title: string;
  description: string;
  ingredients: string;
  steps: string;
  notes: string | null;
  images: string;
  tags: string;
  category: string | null;
  cookingTime: number | null;
  difficulty: string | null;
  createdAt: string;
  isPublic: boolean;
  cookedOn: string | null;
  userId: string;
  user: {
    name: string | null;
    email: string;
  };
}

export default function RecipePage({ params }: { params: { id: string } }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setSelectedUser } = useView();

  useEffect(() => {
    fetchRecipe();
  }, [params.id]);

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/posts?id=${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipe');
      }
      const data = await response.json();
      setRecipe(data);
    } catch (error) {
      setError('Failed to load recipe');
      console.error('Error fetching recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string, userName: string | null, email: string) => {
    setSelectedUser(userId, userName || email);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error || 'Recipe not found'}
          </div>
          <Link
            href="/"
            className="mt-4 inline-block text-indigo-600 hover:text-indigo-800"
          >
            ← Back to recipes
          </Link>
        </div>
      </div>
    );
  }

  const ingredients: Ingredient[] = JSON.parse(recipe.ingredients);
  const steps: Step[] = JSON.parse(recipe.steps);
  const images: string[] = JSON.parse(recipe.images);
  const tags: string[] = JSON.parse(recipe.tags);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-800"
          >
            ← Back to recipes
          </Link>
        </div>

        <article className="bg-white rounded-xl shadow-lg overflow-hidden">
          {images.length > 0 && (
            <div className="relative w-full h-96 group">
              <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                {images.map((image, index) => (
                  <div key={index} className="flex-none w-full h-96 snap-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`${recipe.title} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/800x400?text=No+Image';
                      }}
                    />
                  </div>
                ))}
              </div>
              {images.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className="w-2 h-2 rounded-full bg-white bg-opacity-50"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-8">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
                {recipe.user && (
                  <p className="text-sm text-gray-500 mt-2">
                    by{' '}
                    <button
                      onClick={() => handleUserClick(recipe.userId, recipe.user.name, recipe.user.email)}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none"
                    >
                      {recipe.user.name || recipe.user.email}
                    </button>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {recipe.category && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {recipe.category}
                  </span>
                )}
                {recipe.difficulty && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {recipe.difficulty}
                  </span>
                )}
                {recipe.cookingTime && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {recipe.cookingTime} minutes
                  </span>
                )}
              </div>
            </div>

            <p className="text-lg text-gray-700 mb-8">{recipe.description}</p>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingredients</h2>
                <ul className="space-y-3">
                  {ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-indigo-500 mt-1">•</span>
                      <span className="text-gray-700">
                        <span className="font-medium">{ingredient.name}</span>
                        {ingredient.amount && (
                          <span className="text-gray-500"> - {ingredient.amount}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
                <ol className="space-y-4">
                  {steps.map((step, index) => (
                    <li key={step.id} className="flex gap-4">
                      <span className="flex-none w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <p className="text-gray-700">{step.instruction}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {recipe.notes && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{recipe.notes}</p>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  Created on {new Date(recipe.createdAt).toLocaleDateString()}
                </div>
                {recipe.cookedOn && (
                  <div>
                    Cooked on {new Date(recipe.cookedOn).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
