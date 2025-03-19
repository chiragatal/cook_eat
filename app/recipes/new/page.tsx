'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RecipeForm from '../../components/RecipeForm';
import Navigation from '../../components/Navigation';

export default function NewRecipePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (recipe: any) => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipe),
      });

      if (!response.ok) {
        throw new Error('Failed to create recipe');
      }

      const data = await response.json();
      router.push(`/recipe/${data.id}`);
    } catch (error) {
      console.error('Error creating recipe:', error);
      alert('Failed to create recipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Navigation />
        <div className="mt-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Recipe</h1>
          <RecipeForm
            mode="create"
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
