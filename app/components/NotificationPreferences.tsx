'use client';

import { useNotifications } from '../contexts/NotificationContext';
import { NotificationType } from '../types/notification';

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  REACTION: 'Reactions on your posts',
  COMMENT: 'Comments on your posts',
  COMMENT_REACTION: 'Reactions on your comments',
  COMMENT_MENTION: 'Mentions in comments',
  NEW_POST_FROM_FOLLOWING: 'New posts from users you follow'
};

export default function NotificationPreferences() {
  const { preferences, updatePreference } = useNotifications();

  // Safeguard against preferences being undefined
  const safePreferences = preferences || [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Choose which notifications you&apos;d like to receive
      </p>

      <div className="space-y-3">
        {Object.entries(NOTIFICATION_LABELS).map(([type, label]) => {
          const preference = safePreferences.find(p => p?.type === type);

          return (
            <div key={type} className="flex items-center justify-between">
              <div className="flex-1">
                <label
                  htmlFor={`notification-${type}`}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {label}
                </label>
              </div>
              <div className="ml-4">
                <button
                  id={`notification-${type}`}
                  role="switch"
                  aria-checked={preference?.enabled ?? true}
                  onClick={() => updatePreference(type as NotificationType, !(preference?.enabled ?? true))}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full
                    transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    ${preference?.enabled ?? true ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preference?.enabled ?? true ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
