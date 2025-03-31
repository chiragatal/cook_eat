'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

type ViewContextType = {
  isMyRecipesView: boolean;
  selectedUserId: string | null;
  selectedUserName: string | null;
  toggleView: () => void;
  setSelectedUser: (userId: string | null, userName: string | null) => void;
};

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isMyRecipesView, setIsMyRecipesView] = useState(!!session);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);

  const toggleView = () => {
    if (selectedUserId) {
      // If viewing a user's profile, clear it and go to all recipes
      setSelectedUserId(null);
      setSelectedUserName(null);
      setIsMyRecipesView(false);
      // Use replaceState to clear the URL without triggering a navigation
      window.history.replaceState({}, '', '/');
    } else {
      // Toggle between my recipes and all recipes
      const newIsMyRecipesView = !isMyRecipesView;
      setIsMyRecipesView(newIsMyRecipesView);

      // If toggling to My Recipes view and user is logged in, update URL with user ID
      if (newIsMyRecipesView && session?.user?.id) {
        setSelectedUserId(session.user.id.toString());
        setSelectedUserName(session.user.name || session.user.email || null);
        window.history.replaceState({}, '', `/`);
      }
    }
  };

  const setSelectedUser = (userId: string | null, userName: string | null) => {
    if (userId) {
      setSelectedUserId(userId);
      setSelectedUserName(userName);
      setIsMyRecipesView(false);
      // Use replaceState to update URL without triggering a navigation
      window.history.replaceState({}, '', `/?user=${userId}`);
    } else {
      setSelectedUserId(null);
      setSelectedUserName(null);
      setIsMyRecipesView(false);
      window.history.replaceState({}, '', '/');
    }
  };

  return (
    <ViewContext.Provider value={{
      isMyRecipesView,
      selectedUserId,
      selectedUserName,
      toggleView,
      setSelectedUser
    }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}
