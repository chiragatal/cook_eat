'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Notification, NotificationPreference, NotificationType } from '../types/notification';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreference[];
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updatePreference: (type: NotificationType, enabled: boolean) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      } else if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.read).length);
      } else {
        console.error('Unexpected notification data structure:', data);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [session]);

  const fetchPreferences = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/notifications/preferences');
      if (!response.ok) throw new Error('Failed to fetch notification preferences');
      const data = await response.json();

      if (Array.isArray(data)) {
        setPreferences(data);
      } else if (data && Array.isArray(data.preferences)) {
        setPreferences(data.preferences);
      } else {
        // Handle case where data structure is unexpected
        console.error('Unexpected notification preferences data structure:', data);
        setPreferences([]);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      setPreferences([]);
    }
  }, [session]);

  // Fetch notifications on mount and when session changes
  useEffect(() => {
    if (session) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [session, fetchNotifications, fetchPreferences]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to mark all notifications as read');

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const updatePreference = async (type: NotificationType, enabled: boolean) => {
    try {
      console.log(`Updating preference: ${type} to ${enabled ? 'enabled' : 'disabled'}`);

      if (!session) {
        console.error('Cannot update preference without session');
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, enabled }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error (${response.status}):`, errorText);
        throw new Error(`Failed to update notification preference: ${response.statusText}`);
      }

      const updatedPreference = await response.json();
      console.log('Received updated preference:', updatedPreference);

      // Update the state with the new preference
      setPreferences(prev => {
        if (!prev || !Array.isArray(prev)) {
          return [{ type, enabled }];
        }

        const index = prev.findIndex(p => p.type === type);
        if (index >= 0) {
          const updated = [...prev.slice(0, index), { ...prev[index], enabled }, ...prev.slice(index + 1)];
          console.log('Updated preferences state:', updated);
          return updated;
        } else {
          const updated = [...prev, { type, enabled }];
          console.log('Added new preference to state:', updated);
          return updated;
        }
      });

      // Refresh preferences from server to ensure consistency
      fetchPreferences();

      return updatedPreference;
    } catch (error) {
      console.error('Error updating notification preference:', error);
      throw error; // Re-throw to allow the component to handle it
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        preferences,
        markAsRead,
        markAllAsRead,
        updatePreference,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
