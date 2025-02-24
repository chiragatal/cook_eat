'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import RecipeForm from './RecipeForm';
import RecipeSearch from './RecipeSearch';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useView } from '../contexts/ViewContext';
import { useRouter } from 'next/navigation';
import QuickReactions from './QuickReactions';
import Image from 'next/image';

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
  userId: number;
  user: {
    name?: string;
    email?: string;
  };
}

interface SearchFilters {
  query: string;
  category: string;
  visibility: 'all' | 'public' | 'private';
  reactionFilter: string;
}

interface RecipeListProps {
  selectedDate?: Date | null;
  filterByDate?: boolean;
  userId?: string | number | undefined;
  showPrivate?: boolean;
  publicOnly?: boolean;
}

export default function RecipeList({
  selectedDate,
  filterByDate = false,
  userId,
  showPrivate = false,
  publicOnly = false
}: RecipeListProps) {
  const { data: session } = useSession();
  const { setSelectedUser, isMyRecipesView } = useView();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [shareButtonText, setShareButtonText] = useState('Share Collection');
  const [userReactions, setUserReactions] = useState<Record<number, string[]>>({});
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    visibility: 'all',
    reactionFilter: '',
  });

  // Fetch user reactions for all recipes
  const fetchUserReactions = async (recipeIds: number[]) => {
    if (!session?.user?.id) return;

    try {
      const newReactions: Record<number, string[]> = {};

      await Promise.all(recipeIds.map(async (postId) => {
        const response = await fetch(`/api/posts/${postId}/reactions`);
        if (response.ok) {
          const data = await response.json();
          newReactions[postId] = data.userReactions || [];
        }
      }));

      setUserReactions(prev => ({
        ...prev,
        ...newReactions
      }));
    } catch (error) {
      console.error('Error fetching user reactions:', error);
    }
  };

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();

        if (isMyRecipesView && session?.user?.id) {
          params.append('userId', session.user.id.toString());
        } else if (userId) {
          params.append('userId', userId.toString());
        } else if (publicOnly) {
          params.append('publicOnly', 'true');
        }

        const response = await fetch(`/api/posts?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recipes');
        }

        const data = await response.json();
        setRecipes(data);

        // Fetch reactions for all recipes if user is logged in
        if (session?.user?.id) {
          await fetchUserReactions(data.map((recipe: Recipe) => recipe.id));
        }
      } catch (err) {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [userId, publicOnly, isMyRecipesView, session?.user?.id]);

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

      setRecipes(recipes.filter(r => r.id !== id));
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

  const handleUserClick = (userId: number, userName: string | undefined | null, email: string) => {
    setSelectedUser(userId.toString(), userName || email);
  };

  const handleShare = async () => {
    if (!userId) return;

    try {
      // Create the URL with the user ID as a string
      const url = new URL(window.location.href);
      url.pathname = '/';
      url.searchParams.set('user', userId.toString());

      await navigator.clipboard.writeText(url.toString());
      setShareButtonText('Copied!');
      setTimeout(() => {
        setShareButtonText('Share Collection');
      }, 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  const handleReactionToggled = async (postId: number) => {
    if (!session?.user?.id) return;
    await fetchUserReactions([postId]);
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

      // Filter by visibility if not showing private recipes
      if (!showPrivate && !recipe.isPublic) {
        return false;
      }

      // Filter by reactions if a reaction filter is selected
      if (filters.reactionFilter && session?.user?.id) {
        const recipeReactions = userReactions[recipe.id] || [];
        if (!recipeReactions.includes(filters.reactionFilter)) {
          return false;
        }
      }

      // Filter by search query
      if (filters.query) {
        const searchTerm = filters.query.toLowerCase();
        const ingredients = JSON.parse(recipe.ingredients);

        const titleMatch = recipe.title.toLowerCase().includes(searchTerm);
        const descriptionMatch = recipe.description.toLowerCase().includes(searchTerm);
        const ingredientMatch = ingredients.some((ingredient: Ingredient) =>
          ingredient.name.toLowerCase().includes(searchTerm) ||
          ingredient.amount.toLowerCase().includes(searchTerm)
        );
        const tagMatch = JSON.parse(recipe.tags || '[]').some((tag: string) =>
          tag.toLowerCase().includes(searchTerm)
        );
        const categoryMatch = recipe.category?.toLowerCase().includes(searchTerm);

        if (!(titleMatch || descriptionMatch || ingredientMatch || tagMatch || categoryMatch)) {
          return false;
        }
      }

      // Filter by category
      if (filters.category && recipe.category !== filters.category) {
        return false;
      }

      // Filter by visibility setting in search filters
      if (filters.visibility !== 'all') {
        if (filters.visibility === 'public' && !recipe.isPublic) return false;
        if (filters.visibility === 'private' && recipe.isPublic) return false;
      }

      return true;
    });
  }, [recipes, filters, selectedDate, filterByDate, showPrivate, userReactions, session?.user?.id]);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
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
      <div className="flex justify-between items-center mb-4">
        <RecipeSearch onSearch={setFilters} />
      </div>

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
                        <div key={index} className="flex-none w-full h-48 snap-center relative">
                          <Image
                            src={image}
                            alt={`${recipe.title} - Image ${index + 1}`}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/800x400?text=No+Image';
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

              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="w-full">
                    <Link
                      href={`/recipe/${recipe.id}`}
                      className="text-xl sm:text-2xl font-semibold hover:text-indigo-600 transition-colors block mb-2"
                    >
                      {recipe.title}
                    </Link>
                    {recipe.user && (
                      <p className="text-base sm:text-sm text-gray-500 mb-3">
                        by{' '}
                        <button
                          onClick={() => handleUserClick(recipe.userId, recipe.user.name || '', recipe.user.email || '')}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none"
                        >
                          {recipe.user.name || recipe.user.email}
                        </button>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {recipe.category && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-base sm:text-sm font-medium bg-purple-100 text-purple-800">
                          <svg className="mr-1.5 h-2 w-2 text-purple-400" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          {recipe.category}
                        </span>
                      )}
                      {JSON.parse(recipe.tags || '[]').map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-base sm:text-sm font-medium bg-indigo-100 text-indigo-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {session && (session.user.id === recipe.userId || session.user.isAdmin) && (
                    <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleEdit(recipe)}
                        className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-base sm:text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(recipe.id)}
                        className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-base sm:text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleTogglePublic(recipe)}
                        className={`flex-1 sm:flex-none px-4 py-3 sm:py-2 text-base sm:text-sm rounded-md transition-colors ${
                          recipe.isPublic
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {recipe.isPublic ? 'Public' : 'Private'}
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-base sm:text-sm text-gray-600 mb-4">{recipe.description}</p>
                <div className="mt-4">
                  <QuickReactions postId={recipe.id} onReactionToggled={() => handleReactionToggled(recipe.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
