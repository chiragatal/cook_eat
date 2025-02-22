'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type ViewContextType = {
  isMyRecipesView: boolean;
  selectedUserId: string | null;
  selectedUserName: string | null;
  toggleView: () => void;
  setSelectedUser: (userId: string | number | null, userName: string | null) => void;
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
      router.push('/');
    } else {
      // Toggle between my recipes and all recipes
      const newIsMyRecipesView = !isMyRecipesView;
      setIsMyRecipesView(newIsMyRecipesView);
      router.push('/');
    }
  };

  const setSelectedUser = (userId: string | number | null, userName: string | null) => {
    if (userId) {
      setSelectedUserId(userId.toString());
      setSelectedUserName(userName);
      setIsMyRecipesView(false);
      router.push(`/?user=${userId.toString()}`);
    } else {
      setSelectedUserId(null);
      setSelectedUserName(null);
      setIsMyRecipesView(false);
      router.push('/');
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
