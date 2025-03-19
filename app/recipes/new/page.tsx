'use client';

import RecipeForm from '../../components/RecipeForm';
import Navigation from '../../components/Navigation';

export default function NewRecipePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Navigation />
        <div className="mt-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Recipe</h1>
          <RecipeForm />
        </div>
      </div>
    </div>
  );
}
