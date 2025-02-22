import { Suspense } from 'react';
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import Calendar from './components/Calendar';
import Navigation from './components/Navigation';
import HomeContent from './components/HomeContent';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1400px] mx-auto px-4">
        <Navigation />
        <Suspense fallback={
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        }>
          <HomeContent />
        </Suspense>
      </div>
    </div>
  );
}
