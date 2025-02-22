'use client';

import { useSession } from 'next-auth/react';
import RecipeList from '../components/RecipeList';
import RecipeToggle from '../components/RecipeToggle';

export default function AllRecipes() {
  const { data: session } = useSession();

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">All Public Recipes</h1>

      <RecipeToggle />

      <div className="mb-8">
        <RecipeList publicOnly={true} />
      </div>
    </main>
  );
}
