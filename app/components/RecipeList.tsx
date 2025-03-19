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
import { RichTextContent } from './RichTextEditor';

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
  const [expandedRecipes, setExpandedRecipes] = useState<number[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    visibility: 'all',
    reactionFilter: '',
  });

  // Add a ref for scrolling to expanded content
  const expandedRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Enhance toggleRecipeExpansion with smooth scroll
  const toggleRecipeExpansion = (recipeId: number) => {
    const isExpanding = !expandedRecipes.includes(recipeId);

    setExpandedRecipes(current =>
      current.includes(recipeId)
        ? current.filter(id => id !== recipeId)
        : [...current, recipeId]
    );

    if (isExpanding) {
      // Add a small delay to let the content render before scrolling
      setTimeout(() => {
        const ref = expandedRefs.current[recipeId];
        if (ref) {
          ref.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

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
        const strippedDescription = recipe.description.replace(/<\/?[^>]+(>|$)/g, "");
        const descriptionMatch = strippedDescription.toLowerCase().includes(searchTerm);
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
        <div className="space-y-8">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 ease-in-out cursor-pointer"
              onClick={() => toggleRecipeExpansion(recipe.id)}
            >
              {(() => {
                try {
                  const images = JSON.parse(recipe.images);
                  return images.length > 0 && (
                    <Link href={`/recipe/${recipe.id}`} onClick={(e) => e.stopPropagation()}>
                      <div className="relative w-full h-48 group">
                        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                          {images.map((image: string, index: number) => (
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
                        {images.length > 1 && (
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
                              {images.map((_: string, index: number) => (
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
                  );
                } catch (e) {
                  return null;
                }
              })()}

              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="w-full">
                    <div className="flex items-start mb-2">
                      <Link
                        href={`/recipe/${recipe.id}`}
                        className="text-xl sm:text-2xl font-semibold hover:text-indigo-600 transition-colors text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{recipe.title}</h3>
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {recipe.user && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span>by {recipe.user?.name || 'Anonymous'}</span>
                        </div>
                      )}

                      {recipe.cookingTime && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{recipe.cookingTime} mins</span>
                        </div>
                      )}

                      {recipe.difficulty && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>{recipe.difficulty}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {recipe.category && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-base sm:text-sm font-medium bg-purple-100 text-purple-800">
                          <svg className="mr-1.5 h-2 w-2 text-purple-400" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          {recipe.category}
                        </span>
                      )}
                      {(() => {
                        try {
                          const tags = JSON.parse(recipe.tags || '[]');
                          return tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-3 py-1.5 rounded-full text-base sm:text-sm font-medium bg-indigo-100 text-indigo-800"
                            >
                              #{tag}
                            </span>
                          ));
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>
                  </div>

                  {session && (session.user.id === recipe.userId.toString() || session.user.isAdmin) && (
                    <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(recipe);
                        }}
                        className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-base sm:text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(recipe.id);
                        }}
                        className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-base sm:text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePublic(recipe);
                        }}
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

                <div
                  className="mb-2 overflow-y-auto max-h-24 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRecipeExpansion(recipe.id);
                  }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                    {recipe.description.replace(/<[^>]*>/g, '')}
                  </p>
                </div>

                {/* Card expansion toggle - show collapse button only when expanded */}
                {expandedRecipes.includes(recipe.id) && (
                  <div
                    className="flex items-center mb-2 cursor-pointer text-gray-500 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRecipeExpansion(recipe.id);
                    }}
                  >
                    <span>Collapse</span>
                    <span className="ml-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </span>
                  </div>
                )}

                {/* Expanded content */}
                {expandedRecipes.includes(recipe.id) && (
                  <div
                    ref={(el: HTMLDivElement | null) => {
                      expandedRefs.current[recipe.id] = el;
                      return undefined;
                    }}
                    className="mt-4 border-t pt-4 border-gray-200 dark:border-gray-700 animate-fade-in-up overflow-hidden transition-all duration-300 ease-in-out"
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Ingredients:</h4>
                    <ul className="list-disc pl-5 space-y-1 mb-4">
                      {(() => {
                        try {
                          const ingredients = JSON.parse(recipe.ingredients);
                          return ingredients.map((ingredient: Ingredient, index: number) => (
                            <li key={index} className="text-gray-600 dark:text-gray-300">
                              {ingredient.amount && <span className="font-medium">{ingredient.amount}</span>} {ingredient.name}
                            </li>
                          ));
                        } catch (e) {
                          return <li className="text-gray-600 dark:text-gray-300">Unable to display ingredients</li>;
                        }
                      })()}
                    </ul>

                    <div className="flex justify-end mt-4">
                      <Link
                        href={`/recipe/${recipe.id}`}
                        className="inline-flex items-center bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>View Full Recipe</span>
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="mt-4" onClick={(e) => e.stopPropagation()}>
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
