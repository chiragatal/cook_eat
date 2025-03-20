'use client';

import { useState, useEffect, useRef } from 'react';
import { useView } from '../contexts/ViewContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string | null;
  email: string;
}

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { setSelectedUser } = useView();
  const { data: session } = useSession();
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search users');
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimeout);
  }, [query]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user.id, user.name || user.email);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search users..."
          className="w-full sm:w-48 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>

      {isOpen && (query.trim() || users.length > 0) && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
          {users.length > 0 ? (
            <ul className="max-h-60 overflow-auto py-1">
              {users.map(user => (
                <li
                  key={user.id}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="font-medium text-gray-700 dark:text-gray-300">{user.name || user.email}</div>
                  {user.name && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  )}
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              No users found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
