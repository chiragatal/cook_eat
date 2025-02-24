'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useView } from '../contexts/ViewContext';
import UserSearch from './UserSearch';
import { useState } from 'react';

export default function Navigation() {
  const { data: session } = useSession();
  const { isMyRecipesView, selectedUserId, selectedUserName, toggleView } = useView();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getViewText = () => {
    if (selectedUserId) {
      return `Viewing: ${selectedUserName}'s Recipes`;
    }
    return isMyRecipesView ? 'Viewing: My Recipes' : 'Viewing: All Recipes';
  };

  return (
    <div className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold">Cook & Eat</h1>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="sm:hidden absolute right-4 top-4 p-2 rounded-md hover:bg-gray-100"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>

        {/* Navigation items */}
        <div className={`${isMenuOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
          {session ? (
            <>
              <span className="text-gray-600 text-sm sm:text-base">
                Welcome, {session.user.name || session.user.email}
              </span>
              <div className="w-full sm:w-auto">
                <UserSearch />
              </div>
              <button
                onClick={toggleView}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm"
              >
                {getViewText()}
              </button>
              <button
                onClick={() => signOut()}
                className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="w-full sm:w-auto px-4 py-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
