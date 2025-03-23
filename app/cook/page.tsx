'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Recipe, Ingredient, Step } from '../types';
import ImageCarousel from '../components/ImageCarousel';
import Link from 'next/link';

interface ParsedRecipe extends Omit<Recipe, 'steps' | 'ingredients' | 'images'> {
  steps: Step[];
  ingredients: Ingredient[];
  images: string[];
}

export default function CookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipeId = searchParams.get('id');

  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!recipeId) {
      setError('No recipe ID provided');
      setLoading(false);
      return;
    }

    const fetchRecipe = async () => {
      try {
        // Update to use the correct API endpoint for recipes
        const response = await fetch(`/api/posts?id=${recipeId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recipe');
        }
        const data = await response.json();

        // Parse JSON strings
        const parsedSteps = typeof data.steps === 'string' ? JSON.parse(data.steps) : data.steps;
        const parsedIngredients = typeof data.ingredients === 'string' ? JSON.parse(data.ingredients) : data.ingredients;
        const parsedImages = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;

        setRecipe({
          ...data,
          steps: parsedSteps as Step[],
          ingredients: parsedIngredients as Ingredient[],
          images: parsedImages as string[]
        });
      } catch (err) {
        console.error('Error fetching recipe:', err);
        setError('Failed to load recipe. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId]);

  const toggleStepCompletion = (stepIndex: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex);
      } else {
        newSet.add(stepIndex);
      }
      return newSet;
    });
  };

  const goToNextStep = () => {
    if (recipe && currentStep < recipe.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      // Scroll to top
      window.scrollTo(0, 0);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      // Scroll to top
      window.scrollTo(0, 0);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error || 'Recipe not found'}</p>
          <Link
            href="/"
            className="mt-4 inline-block bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{recipe.title}</h1>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-2 w-full bg-gray-200 rounded-full">
          <div
            className="h-2 bg-green-500 rounded-full"
            style={{ width: `${(currentStep + 1) / recipe.steps.length * 100}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-600 mt-2">
          Step {currentStep + 1} of {recipe.steps.length}
        </div>
      </div>

      {/* Images */}
      {recipe.images.length > 0 && (
        <div className="mb-8">
          <ImageCarousel
            images={recipe.images}
            title={recipe.title}
            carouselId={recipe.id || 'recipe'}
            className="h-72 md:h-96"
          />
        </div>
      )}

      {/* Current step */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Step {currentStep + 1}</h2>
        <p className="text-lg mb-6">{recipe.steps[currentStep].instruction}</p>

        <button
          onClick={() => toggleStepCompletion(currentStep)}
          className={`flex items-center ${
            completedSteps.has(currentStep)
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'bg-gray-100 text-gray-800 border-gray-300'
          } border px-4 py-2 rounded-md`}
        >
          <span className={`w-6 h-6 rounded-full mr-2 flex items-center justify-center ${
            completedSteps.has(currentStep) ? 'bg-green-500 text-white' : 'bg-gray-300'
          }`}>
            {completedSteps.has(currentStep) && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          {completedSteps.has(currentStep) ? 'Completed' : 'Mark as Complete'}
        </button>
      </div>

      {/* Ingredients reference */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
        <ul className="list-disc pl-5 space-y-2">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index} className="text-gray-700 dark:text-gray-300">
              {ingredient.amount} {ingredient.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={goToPrevStep}
          disabled={currentStep === 0}
          className={`flex items-center px-4 py-2 rounded-md ${
            currentStep === 0
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous Step
        </button>

        <button
          onClick={goToNextStep}
          disabled={currentStep === recipe.steps.length - 1}
          className={`flex items-center px-4 py-2 rounded-md ${
            currentStep === recipe.steps.length - 1
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Next Step
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Return to recipe button */}
      <div className="text-center mt-8">
        <Link
          href={`/recipe/${recipeId}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Return to Recipe Page
        </Link>
      </div>
    </div>
  );
}
