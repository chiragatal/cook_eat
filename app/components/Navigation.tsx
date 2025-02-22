'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useView } from '../contexts/ViewContext';
import UserSearch from './UserSearch';

export default function Navigation() {
  const { data: session } = useSession();
  const { isMyRecipesView, selectedUserId, selectedUserName, toggleView } = useView();

  const getViewText = () => {
    if (selectedUserId) {
      return `Viewing: ${selectedUserName}'s Recipes`;
    }
    return isMyRecipesView ? 'Viewing: My Recipes' : 'Viewing: All Recipes';
  };

  return (
    <div className="flex justify-between items-center mb-12">
      <h1 className="text-4xl font-bold">Cook & Eat</h1>
      <div className="flex items-center gap-4">
        {session ? (
          <>
            <span className="text-gray-600">
              Welcome, {session.user.name || session.user.email}
            </span>
            <UserSearch />
            <button
              onClick={toggleView}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {getViewText()}
            </button>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth/signin"
              className="px-4 py-2 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
