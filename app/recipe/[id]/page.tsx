'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useView } from '../../contexts/ViewContext';
import RecipeReactions from '../../components/RecipeReactions';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import Navigation from '../../components/Navigation';
import QuickReactions from '../../components/QuickReactions';
import { RichTextContent } from '../../components/RichTextEditor';
import Comments from '../../components/Comments';
import ImageCarousel from '../../components/ImageCarousel';
import { Recipe, Ingredient, Step } from '../../types';

export default function RecipePage({ params }: { params: { id: string } }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareButtonText, setShareButtonText] = useState('Share Recipe');
  const router = useRouter();
  const { setSelectedUser } = useView();
  const { data: session } = useSession();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = recipe?.images ? JSON.parse(recipe.images) : [];
  const [isSharing, setIsSharing] = useState(false);

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

  const handleUserClick = (userId: number, userName: string | null, email: string) => {
    setSelectedUser(String(userId), userName || email);
    router.push('/');
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareButtonText('Link Copied!');
      setTimeout(() => {
        setShareButtonText('Share Recipe');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setShareButtonText('Failed to copy');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;

    if (window.confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/posts/${recipe.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete recipe');
        }

        router.push('/');
      } catch (error) {
        console.error('Error deleting recipe:', error);
        alert('Failed to delete the recipe. Please try again.');
      }
    }
  };

  const handleTogglePublic = async () => {
    if (!recipe) return;

    try {
      const response = await fetch(`/api/posts/${recipe.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublic: !recipe.isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update recipe');
      }

      // Update the recipe state
      setRecipe({
        ...recipe,
        isPublic: !recipe.isPublic,
      });
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('Failed to update the recipe. Please try again.');
    }
  };

  // Add this function to format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Format ingredient with new pattern
  const formatIngredient = (ingredient: Ingredient) => {
    if (!ingredient.amount) return ingredient.name;
    return `${ingredient.name} · ${ingredient.amount}`;
  };

  const nextImage = useCallback(() => {
    if (!images.length) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (!images.length) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nextImage, prevImage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Navigation />
          <div className="mt-12 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
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
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Error: {error || 'Recipe not found'}</h2>
            <Link href="/" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline">
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ingredients: Ingredient[] = JSON.parse(recipe.ingredients);
  const steps: Step[] = JSON.parse(recipe.steps);
  const tags: string[] = JSON.parse(recipe.tags);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Navigation />

        <div className="mt-8">
          <Link href="/" className="flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-6">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to recipes
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {images.length > 0 && (
              <div className="mb-8">
                <ImageCarousel
                  images={images}
                  title={recipe.title}
                  carouselId={recipe.id || ""}
                  className="h-96"
                  navigationButtonSize="large"
                  showAlways={true}
                  onIndicatorChange={setCurrentImageIndex}
                />
              </div>
            )}

            <div className="p-6">
              <div className="mb-6">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{recipe.title}</h1>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleShare}
                      disabled={isSharing}
                      className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md shadow"
                    >
                      {isSharing ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Copying...
                        </span>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                          </svg>
                          {shareButtonText}
                        </>
                      )}
                    </button>

                    <Link
                      href={`/cook?id=${recipe.id}`}
                      className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path>
                      </svg>
                      Cook Mode
                    </Link>

                    {session && ((String(session.user.id) === String(recipe?.userId)) || session.user.isAdmin) && (
                      <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                        <Link
                          href={`/recipe/${recipe.id}/edit`}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={handleDelete}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                        >
                          Delete
                        </button>
                        <button
                          onClick={handleTogglePublic}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
                        >
                          {recipe.isPublic ? 'Make Private' : 'Make Public'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {recipe.user && (
                    <span
                      className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                      onClick={() => handleUserClick(
                        recipe.userId,
                        recipe.user?.name || null,
                        recipe.user?.email || ''
                      )}
                    >
                      By {recipe.user.name || recipe.user.email}
                    </span>
                  )}

                  {recipe.category && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      {recipe.category}
                    </span>
                  )}

                  {recipe.difficulty && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {recipe.difficulty}
                    </span>
                  )}

                  {recipe.cookingTime && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {recipe.cookingTime} min
                    </span>
                  )}
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Description</h2>
                  <RichTextContent content={recipe.description} className="mb-6 recipe-description" />
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="md:col-span-1">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Ingredients</h2>
                  <ul className="space-y-2">
                    {ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-flex items-center justify-center h-5 w-5 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full mr-2 text-xs">
                          •
                        </span>
                        <div className="text-gray-700 dark:text-gray-300">
                          <div>
                            <span className="font-medium">{ingredient.name}</span>
                            {ingredient.amount && (
                              <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">· {ingredient.amount}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="md:col-span-2">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Instructions</h2>
                  <ol className="space-y-4">
                    {steps.map((step, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full mr-3 text-sm font-semibold">
                          {index + 1}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 flex-1">{step.instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {recipe.notes && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Notes</h2>
                  <RichTextContent content={recipe.notes} className="mb-6 recipe-notes" />
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <QuickReactions postId={recipe.id || 0} />
                  </div>

                  <div className="flex flex-wrap gap-4 text-right">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Created</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {recipe.createdAt ? formatDate(recipe.createdAt) : '-'}
                        </p>
                      </div>
                    </div>

                    {recipe.cookedOn && (
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Last cooked</span>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(recipe.cookedOn)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <Comments postId={recipe.id || 0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
