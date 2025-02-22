'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import RecipeList from '../components/RecipeList';
import RecipeToggle from '../components/RecipeToggle';

export default function MyRecipes() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">My Recipes</h1>

      <RecipeToggle />

      <div className="mb-8">
        <RecipeList
          userId={session.user.id}
          showPrivate={true}
        />
      </div>
    </main>
  );
}
