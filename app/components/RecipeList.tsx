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
import { RichTextContent, TruncatedRichText } from './RichTextEditor';
import { Clock, Users, CalendarCheck, MessageCircle } from 'lucide-react';
import { formatDate } from '../../lib/utils';

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
  servings: number;
  cookedDate?: string;
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
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    visibility: 'all',
    reactionFilter: '',
  });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const galleryRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  // Fetch comment counts for all recipes
  const fetchCommentCounts = async (recipeIds: number[]) => {
    try {
      const counts: Record<number, number> = {};

      await Promise.all(recipeIds.map(async (recipeId) => {
        const response = await fetch(`/api/posts/${recipeId}/comments/count`);
        if (response.ok) {
          const data = await response.json();
          counts[recipeId] = data.count || 0;
        }
      }));

      setCommentCounts(counts);
    } catch (error) {
      console.error('Error fetching comment counts:', error);
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

        // Fetch comment counts for all recipes
        await fetchCommentCounts(data.map((recipe: Recipe) => recipe.id));
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
    return `${ingredient.name} · ${ingredient.amount}`;
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

  const handleMenuClick = (e: React.MouseEvent, recipeId: number) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === recipeId ? null : recipeId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if the click is outside the menu
      if (openMenuId !== null && !target.closest('.menu-dropdown')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

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

  // Add scroll event handler for continuous scrolling
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const gallery = e.target as HTMLDivElement;
      const recipeId = parseInt(gallery.getAttribute('data-recipe-id') || '0');
      const images = JSON.parse(recipes.find(r => r.id === recipeId)?.images || '[]');

      if (images.length <= 1) return;

      const scrollLeft = gallery.scrollLeft;
      const scrollWidth = gallery.scrollWidth;
      const clientWidth = gallery.clientWidth;

      // If we're at the beginning (showing the last cloned image)
      if (Math.abs(scrollLeft) < 10) {
        // Prevent rapid re-triggering
        gallery.removeEventListener('scroll', handleScroll);

        // Jump to the real last image (second to last in the DOM because of the clones)
        setTimeout(() => {
          gallery.scrollTo({
            left: scrollWidth - (2 * clientWidth),
            behavior: 'instant'
          });

          // Re-add the event listener after the jump
          setTimeout(() => {
            gallery.addEventListener('scroll', handleScroll);
          }, 100);
        }, 50);
      }
      // If we're at the end (showing the first cloned image)
      else if (scrollLeft + clientWidth >= scrollWidth - 10) {
        // Prevent rapid re-triggering
        gallery.removeEventListener('scroll', handleScroll);

        // Jump to the real first image
        setTimeout(() => {
          gallery.scrollTo({
            left: clientWidth,
            behavior: 'instant'
          });

          // Re-add the event listener after the jump
          setTimeout(() => {
            gallery.addEventListener('scroll', handleScroll);
          }, 100);
        }, 50);
      }
    };

    // Add scroll event listeners to all galleries
    Object.entries(galleryRefs.current).forEach(([recipeId, gallery]) => {
      if (gallery) {
        gallery.addEventListener('scroll', handleScroll);
      }
    });

    return () => {
      // Remove scroll event listeners
      Object.entries(galleryRefs.current).forEach(([recipeId, gallery]) => {
        if (gallery) {
          gallery.removeEventListener('scroll', handleScroll);
        }
      });
    };
  }, [recipes]);

  // Initialize all galleries when recipes are loaded or changed
  useEffect(() => {
    // Set initial position for all galleries to show the first real image (after the cloned last image)
    Object.entries(galleryRefs.current).forEach(([recipeId, gallery]) => {
      if (gallery) {
        try {
          const recipeImages = JSON.parse(recipes.find(r => r.id === parseInt(recipeId))?.images || '[]');
          if (recipeImages.length > 1) {
            // Position at the first real image (after the cloned last image)
            gallery.scrollTo({
              left: gallery.clientWidth,
              behavior: 'instant'
            });
          }
        } catch (e) {
          console.error('Error initializing gallery position:', e);
        }
      }
    });
  }, [recipes, galleryRefs.current]);

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
                        <div
                          ref={(el) => {
                            if (el) {
                              galleryRefs.current[recipe.id] = el;
                            }
                          }}
                          data-recipe-id={recipe.id}
                          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x"
                          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                        >
                          {/* Add last image at the beginning for smooth transition */}
                          {images.length > 1 && (
                            <div className="flex-none w-full h-48 snap-center relative">
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                <img
                                  src={images[images.length - 1]}
                                  alt={`${recipe.title} - Image ${images.length}`}
                                  className="max-w-full max-h-full w-auto h-auto object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {images.map((image: string, index: number) => (
                            <div key={index} className="flex-none w-full h-48 snap-center relative">
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                <img
                                  src={image}
                                  alt={`${recipe.title} - Image ${index + 1}`}
                                  className="max-w-full max-h-full w-auto h-auto object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                          {/* Add first image at the end for smooth transition */}
                          {images.length > 1 && (
                            <div className="flex-none w-full h-48 snap-center relative">
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                <img
                                  src={images[0]}
                                  alt={`${recipe.title} - Image 1`}
                                  className="max-w-full max-h-full w-auto h-auto object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const gallery = e.currentTarget.parentElement?.querySelector('.snap-x');
                                if (gallery) {
                                  // Ensure we're at a proper position first
                                  const currentIndex = Math.round(gallery.scrollLeft / gallery.clientWidth);
                                  // If we're at the first position (the cloned last image), jump to the real first image
                                  if (currentIndex === 0) {
                                    // Set to the first real image position
                                    gallery.scrollTo({
                                      left: gallery.clientWidth,
                                      behavior: 'instant'
                                    });
                                    // Give time for the scroll to complete
                                    setTimeout(() => {
                                      // Then scroll to the last real image
                                      gallery.scrollTo({
                                        left: (images.length) * gallery.clientWidth,
                                        behavior: 'smooth'
                                      });
                                    }, 50);
                                    return;
                                  }

                                  // Normal previous behavior
                                  const targetIndex = Math.max(currentIndex - 1, 0);
                                  gallery.scrollTo({
                                    left: targetIndex * gallery.clientWidth,
                                    behavior: 'smooth'
                                  });
                                }
                              }}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const gallery = e.currentTarget.parentElement?.querySelector('.snap-x');
                                if (gallery) {
                                  // Ensure we're at a proper position first
                                  const currentIndex = Math.round(gallery.scrollLeft / gallery.clientWidth);
                                  // If we're at the last position (the cloned first image), jump to the real last image
                                  if (currentIndex >= images.length + 1) {
                                    // Set to the last real image position
                                    gallery.scrollTo({
                                      left: images.length * gallery.clientWidth,
                                      behavior: 'instant'
                                    });
                                    // Give time for the scroll to complete
                                    setTimeout(() => {
                                      // Then scroll to the first real image
                                      gallery.scrollTo({
                                        left: gallery.clientWidth,
                                        behavior: 'smooth'
                                      });
                                    }, 50);
                                    return;
                                  }

                                  // Normal next behavior
                                  const targetIndex = Math.min(currentIndex + 1, images.length + 1);
                                  gallery.scrollTo({
                                    left: targetIndex * gallery.clientWidth,
                                    behavior: 'smooth'
                                  });
                                }
                              }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                    <div className="flex items-start justify-between mb-2">
                      <Link
                        href={`/recipe/${recipe.id}`}
                        className="text-xl sm:text-2xl font-semibold hover:text-indigo-600 transition-colors text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{recipe.title}</h3>
                      </Link>

                      {session && ((String(session.user.id) === String(recipe.userId)) || session.user.isAdmin) && (
                        <div className="relative flex-shrink-0 ml-2">
                          <button
                            onClick={(e) => handleMenuClick(e, recipe.id)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 menu-dropdown"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>

                          {openMenuId === recipe.id && (
                            <div
                              className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10 menu-dropdown"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1" role="menu" aria-orientation="vertical">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleEdit(recipe);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                                  role="menuitem"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleDelete(recipe.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/50"
                                  role="menuitem"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleTogglePublic(recipe);
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    recipe.isPublic
                                      ? 'text-green-700 dark:text-green-200 hover:bg-green-50 dark:hover:bg-green-900/50'
                                      : 'text-gray-700 dark:text-gray-200'
                                  }`}
                                  role="menuitem"
                                >
                                  {recipe.isPublic ? 'Make Private' : 'Make Public'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {recipe.user && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span
                            className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                            onClick={() => handleUserClick(
                              recipe.userId,
                              recipe.user?.name,
                              recipe.user?.email || recipe.user?.name || "Anonymous"
                            )}
                          >
                            by {recipe.user?.name || 'Anonymous'}
                          </span>
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
                </div>

                {/* Description - truncated when not expanded */}
                <div
                  className="mb-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRecipeExpansion(recipe.id);
                  }}
                >
                  {!expandedRecipes.includes(recipe.id) ? (
                    <TruncatedRichText
                      content={recipe.description}
                      maxHeight="6rem"
                      className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
                      onReadMore={(e) => {
                        e?.stopPropagation();
                        toggleRecipeExpansion(recipe.id);
                      }}
                    />
                  ) : (
                    <RichTextContent
                      content={recipe.description}
                      className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
                    />
                  )}
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
                              {formatIngredient(ingredient)}
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
                  <div className="flex items-center gap-2">
                    {commentCounts[recipe.id] > 0 && (
                      <Link
                        href={`/recipe/${recipe.id}#comments`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle size={16} />
                        <span>{commentCounts[recipe.id]}</span>
                      </Link>
                    )}
                    <QuickReactions postId={recipe.id} onReactionToggled={() => handleReactionToggled(recipe.id)} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
