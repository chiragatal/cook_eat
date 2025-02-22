'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function RecipeToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const isMyRecipes = pathname === '/my-recipes';

  return (
    <div className="flex justify-center mb-6">
      <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
        <button
          onClick={() => router.push('/my-recipes')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isMyRecipes
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Recipes
        </button>
        <button
          onClick={() => router.push('/all-recipes')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !isMyRecipes
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Recipes
        </button>
      </div>
    </div>
  );
}
