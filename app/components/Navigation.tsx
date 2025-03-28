'use client';

import { useSession, signOut, signIn } from 'next-auth/react';
import Link from 'next/link';
import { useView } from '../contexts/ViewContext';
import UserSearch from './UserSearch';
import { useState, useEffect, useRef } from 'react';
import Logo from './Logo';
import { usePathname } from 'next/navigation';
import NotificationList from './NotificationList';

export default function Navigation() {
  const { data: session } = useSession();
  const { isMyRecipesView, selectedUserId, selectedUserName, toggleView } = useView();
  const [theme, setTheme] = useState('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Path patterns where we don't want to show the "Viewing" button
  const hideViewingButtonPaths = [
    /^\/recipe\/[^\/]+$/,     // Single recipe view: /recipe/123
    /^\/recipe\/[^\/]+\/edit$/, // Recipe edit: /recipe/123/edit
    /^\/recipes\/new$/        // New recipe page
  ];

  const shouldShowViewingButton = () => {
    // Don't show for specific paths
    return !hideViewingButtonPaths.some(pattern => pattern.test(pathname || ''));
  };

  useEffect(() => {
    // Check if theme is stored in localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    <nav className="bg-white dark:bg-gray-800 shadow-sm mb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:h-16 justify-between items-start sm:items-center py-3 sm:py-0">
          <div className="flex w-full sm:w-auto items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
              <Logo size={28} />
              <span>Cook-Eat</span>
            </Link>

            {/* Mobile menu button */}
            <div className="flex sm:hidden items-center">
              {session && (
                <>
                  <span className="mr-3 text-sm text-gray-700 dark:text-gray-300">
                    Hi, {session.user?.name?.split(' ')[0] || session.user?.email?.split('@')[0]}
                  </span>
                  <NotificationList />
                </>
              )}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-md bg-gray-100 dark:bg-gray-700 p-2 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                aria-label="Toggle menu"
                aria-expanded={isMenuOpen}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* View toggle button - on a new line for mobile */}
          {session && shouldShowViewingButton() && (
            <div className="flex w-full sm:w-auto mt-3 sm:mt-0">
              <button
                onClick={toggleView}
                className="w-full sm:w-auto rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {getViewText()}
              </button>
            </div>
          )}

          {/* Desktop navigation items */}
          <div className="hidden sm:flex items-center gap-4">
            {session ? (
              <>
                <span className="text-gray-700 dark:text-gray-300">
                  Hi, {session.user?.name || session.user?.email}
                </span>
                <div className="flex items-center gap-3">
                  {/* Add NotificationList before the theme toggle */}
                  {session && <NotificationList />}
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
                  <button
                    onClick={() => signOut()}
                    className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <UserSearch />
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

          {/* Mobile dropdown menu */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="sm:hidden absolute right-4 top-16 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg p-2 z-10 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex flex-col py-2 gap-3">
                {session ? (
                  <>
                    <UserSearch />
                    <button
                      onClick={() => {
                        const notificationButton = document.querySelector('[aria-label="Notifications"]') as HTMLButtonElement;
                        if (notificationButton) {
                          notificationButton.click();
                        }
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span>Notifications</span>
                    </button>
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      {theme === 'light' ? (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          <span>Dark Mode</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span>Light Mode</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <UserSearch />
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      {theme === 'light' ? (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          <span>Dark Mode</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span>Light Mode</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        signIn();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign in</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
