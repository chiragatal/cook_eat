'use client';

import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types/notification';
import Link from 'next/link';

export default function NotificationList() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll for new notifications every minute
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const getNotificationContent = (notification: Notification) => {
    switch (notification.type) {
      case 'REACTION':
        return `reacted with ${notification.data?.reactionType} to your post "${notification.data?.postTitle}"`;
      case 'COMMENT':
        return `commented on your post "${notification.data?.postTitle}"`;
      case 'COMMENT_REACTION': {
        const content = notification.data?.commentContent || '';
        return `reacted to your comment "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`;
      }
      case 'COMMENT_MENTION': {
        const content = notification.data?.commentContent || '';
        return `mentioned you in a comment: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`;
      }
      case 'NEW_POST_FROM_FOLLOWING':
        return `shared a new recipe: "${notification.data?.postTitle}"`;
      default:
        return 'sent you a notification';
    }
  };

  const getNotificationLink = (notification: Notification) => {
    switch (notification.type) {
      case 'COMMENT_MENTION':
      case 'COMMENT_REACTION':
        return `/posts/${notification.targetId}#comment-${notification.data?.commentContent}`;
      default:
        return `/posts/${notification.targetId}`;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 flex items-center gap-2"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="sm:hidden">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 sm:inline-flex hidden items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
        {/* Mobile unread count */}
        {unreadCount > 0 && (
          <span className="sm:hidden inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full ml-1">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute inset-x-0 sm:inset-auto sm:right-0 top-full sm:mt-2 sm:w-80 w-full bg-white dark:bg-gray-800 sm:rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={getNotificationLink(notification)}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      setIsOpen(false);
                    }}
                    className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {getNotificationContent(notification)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
