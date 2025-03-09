import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserContextType {
  userName: string;
  setUserName: (name: string) => void;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  updateProfile: (data: { name?: string; avatar?: string | null }) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState<string>("Usuário Principal");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const updateProfile = (data: { name?: string; avatar?: string | null }) => {
    if (data.name) {
      setUserName(data.name);
    }
    if (data.avatar !== undefined) {
      setAvatarUrl(data.avatar);
    }
  };

  return (
    <UserContext.Provider value={{ 
      userName, 
      setUserName, 
      avatarUrl, 
      setAvatarUrl,
      updateProfile 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 