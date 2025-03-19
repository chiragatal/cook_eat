'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useView } from '../contexts/ViewContext';
import UserSearch from './UserSearch';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const { data: session } = useSession();
  const { isMyRecipesView, selectedUserId, selectedUserName, toggleView } = useView();
  const [theme, setTheme] = useState('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Check if theme is stored in localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const getViewText = () => {
    if (selectedUserId) {
      return `Viewing: ${selectedUserName}'s Recipes`;
    }
    return isMyRecipesView ? 'Viewing: My Recipes' : 'Viewing: All Recipes';
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-semibold text-gray-900 dark:text-white">
              Cook & Eat
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700 dark:text-gray-300">
                    Hi, {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Sign out
                  </button>
                </div>
                <button
                  onClick={toggleTheme}
                  className="rounded-md bg-gray-100 dark:bg-gray-700 p-2 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  aria-label="Toggle dark mode"
                >
                  {theme === 'light' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </button>
                <UserSearch />
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className="rounded-md bg-gray-100 dark:bg-gray-700 p-2 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  aria-label="Toggle dark mode"
                >
                  {theme === 'light' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => signIn()}
                  className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
