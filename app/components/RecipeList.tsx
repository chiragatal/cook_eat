'use client';

import { useEffect, useState, useMemo } from 'react';
import RecipeForm from './RecipeForm';
import RecipeSearch from './RecipeSearch';
import Link from 'next/link';

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
  ingredients: string; // JSON string of Ingredient[]
  steps: string; // JSON string of Step[]
  notes: string | null;
  images: string; // JSON string of array of image paths
  tags: string; // JSON string of string[]
  category: string | null;
  cookingTime: number | null;
  difficulty: string | null;
  createdAt: string;
  isPublic: boolean;
  cookedOn: string | null;
}

interface SearchFilters {
  query: string;
  category: string;
  visibility: 'all' | 'public' | 'private';
}

interface RecipeListProps {
  selectedDate?: Date | null;
  filterByDate?: boolean;
}

export default function RecipeList({ selectedDate, filterByDate = false }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    visibility: 'all',
  });

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      const data = await response.json();
      setRecipes(data);
      setError(null);
    } catch (err) {
      setError('Failed to load recipes');
      console.error('Error fetching recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }

      setRecipes(recipes.filter(recipe => recipe.id !== id));
    } catch (err) {
      console.error('Error deleting recipe:', err);
      alert('Failed to delete recipe');
    }
  };

  const handleEdit = async (recipe: Recipe) => {
    setEditingRecipe(recipe);
  };

  const handleUpdate = async (updatedRecipe: Partial<Recipe>) => {
    if (!editingRecipe?.id) return;

    try {
      const response = await fetch(`/api/posts?id=${editingRecipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecipe),
      });

      if (!response.ok) {
        throw new Error('Failed to update recipe');
      }

      const savedRecipe = await response.json();
      setRecipes(recipes.map(r => r.id === savedRecipe.id ? savedRecipe : r));
      setEditingRecipe(null);
    } catch (err) {
      console.error('Error updating recipe:', err);
      alert('Failed to update recipe');
    }
  };

  const handleTogglePublic = async (recipe: Recipe) => {
    try {
      const response = await fetch(`/api/posts?id=${recipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...recipe,
          isPublic: !recipe.isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update recipe');
      }

      const updatedRecipe = await response.json();
      setRecipes(recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
    } catch (err) {
      console.error('Error updating recipe:', err);
      alert('Failed to update recipe visibility');
    }
  };

  const formatIngredient = (ingredient: Ingredient) => {
    if (!ingredient.amount) return ingredient.name;
    return `${ingredient.name}: ${ingredient.amount}`;
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      // Filter by date if enabled and date is selected
      if (filterByDate && selectedDate) {
        const cookedDate = recipe.cookedOn ? new Date(recipe.cookedOn) : null;
        if (!cookedDate) return false;

        const isSameDate =
          cookedDate.getDate() === selectedDate.getDate() &&
          cookedDate.getMonth() === selectedDate.getMonth() &&
          cookedDate.getFullYear() === selectedDate.getFullYear();

        if (!isSameDate) return false;
      }

      // Filter by search query
      if (filters.query) {
        const searchTerm = filters.query.toLowerCase();
        const ingredients = JSON.parse(recipe.ingredients);

        // Search in title, description
        const titleMatch = recipe.title.toLowerCase().includes(searchTerm);
        const descriptionMatch = recipe.description.toLowerCase().includes(searchTerm);

        // Search in ingredients (both name and amount)
        const ingredientMatch = ingredients.some((ingredient: Ingredient) =>
          ingredient.name.toLowerCase().includes(searchTerm) ||
          ingredient.amount.toLowerCase().includes(searchTerm)
        );

        // Search in tags
        const tagMatch = JSON.parse(recipe.tags || '[]').some((tag: string) =>
          tag.toLowerCase().includes(searchTerm)
        );

        // Search in category
        const categoryMatch = recipe.category?.toLowerCase().includes(searchTerm);

        if (!(titleMatch || descriptionMatch || ingredientMatch || tagMatch || categoryMatch)) {
          return false;
        }
      }

      // Filter by category
      const categoryMatch = !filters.category || recipe.category === filters.category;

      // Filter by visibility
      const visibilityMatch = filters.visibility === 'all' ||
        (filters.visibility === 'public' && recipe.isPublic) ||
        (filters.visibility === 'private' && !recipe.isPublic);

      return categoryMatch && visibilityMatch;
    });
  }, [recipes, filters, selectedDate, filterByDate]);

  if (editingRecipe) {
    return (
      <RecipeForm
        mode="edit"
        recipe={editingRecipe}
        onSave={handleUpdate}
        onCancel={() => setEditingRecipe(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
        {error}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="bg-gray-50 text-gray-500 p-8 rounded-lg text-center">
        <p className="text-lg">No recipes yet.</p>
        <p className="text-sm mt-2">Create your first recipe using the form!</p>
      </div>
    );
  }

  return (
    <div>
      <RecipeSearch onSearch={setFilters} />
      {filteredRecipes.length === 0 ? (
        <div className="bg-gray-50 text-gray-500 p-8 rounded-lg text-center">
          <p className="text-lg">No recipes found matching your filters.</p>
          <p className="text-sm mt-2">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {JSON.parse(recipe.images).length > 0 && (
                <Link href={`/recipe/${recipe.id}`}>
                  <div className="relative w-full h-48 group">
                    <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                      {JSON.parse(recipe.images).map((image: string, index: number) => (
                        <div key={index} className="flex-none w-full h-48 snap-center">
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
                    {JSON.parse(recipe.images).length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const gallery = e.currentTarget.parentElement?.querySelector('.snap-x');
                            if (gallery) {
                              gallery.scrollBy({ left: -gallery.clientWidth, behavior: 'smooth' });
                            }
                          }}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const gallery = e.currentTarget.parentElement?.querySelector('.snap-x');
                            if (gallery) {
                              gallery.scrollBy({ left: gallery.clientWidth, behavior: 'smooth' });
                            }
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                          {JSON.parse(recipe.images).map((_: string, index: number) => (
                            <div
                              key={index}
                              className="w-2 h-2 rounded-full bg-white bg-opacity-50"
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Link>
              )}

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Link
                      href={`/recipe/${recipe.id}`}
                      className="text-xl font-semibold hover:text-indigo-600 transition-colors"
                    >
                      {recipe.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {recipe.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-purple-100 text-purple-800">
                          <svg className="mr-1.5 h-2 w-2 text-purple-400" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          {recipe.category}
                        </span>
                      )}
                      {JSON.parse(recipe.tags || '[]').map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(recipe)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleTogglePublic(recipe)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        recipe.isPublic
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {recipe.isPublic ? 'Public' : 'Private'}
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{recipe.description}</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ingredients</h3>
                    <ul className="space-y-2">
                      {JSON.parse(recipe.ingredients).map((ingredient: Ingredient, index: number) => (
                        <li key={index} className="text-gray-600">
                          <span className="font-medium">{ingredient.name}:</span> {ingredient.amount}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Steps</h3>
                    <ul className="space-y-2">
                      {JSON.parse(recipe.steps || '[]').map((step: Step, index: number) => (
                        <li key={step.id || index} className="flex items-start gap-2 text-gray-600">
                          <span className="text-indigo-500 mt-1">•</span>
                          <span>{step.instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {recipe.notes && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">{recipe.notes}</p>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-500 pt-4 border-t mt-6">
                  {new Date(recipe.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
