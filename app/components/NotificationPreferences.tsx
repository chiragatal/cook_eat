'use client';

import { useState } from 'react';
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
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Safeguard against preferences being undefined
  const safePreferences = preferences || [];

  console.log('Current notification preferences:', safePreferences);

  const handleToggle = async (type: NotificationType, currentEnabled: boolean) => {
    try {
      setErrorMessage(null);
      console.log(`Toggling preference ${type} from ${currentEnabled} to ${!currentEnabled}`);
      setIsUpdating(prev => ({ ...prev, [type]: true }));

      await updatePreference(type, !currentEnabled);

      console.log(`Successfully toggled ${type}`);
    } catch (error) {
      console.error(`Error toggling preference ${type}:`, error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update preference');
    } finally {
      setIsUpdating(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Choose which notifications you&apos;d like to receive
      </p>

      {errorMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p className="text-sm">{errorMessage}</p>
          <p className="text-xs mt-1">Try refreshing the page or sign in again if the problem persists.</p>
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(NOTIFICATION_LABELS).map(([type, label]) => {
          const preference = safePreferences.find(p => p?.type === type);
          const enabled = preference?.enabled ?? true;
          const updating = isUpdating[type] || false;

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
                  aria-checked={enabled}
                  disabled={updating}
                  onClick={() => handleToggle(type as NotificationType, enabled)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full
                    transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    ${updating ? 'opacity-50 cursor-wait' : ''}
                    ${enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${enabled ? 'translate-x-6' : 'translate-x-1'}
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
