import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types/types';

const STORAGE_KEY = 'aiImageStudio_user';
const API_KEY_STORAGE_KEY = 'aiImageStudio_apiKey';

interface AppContextType {
  user: User | null;
  apiKey: string;
  isReady: boolean;
  setUser: (data: User | null) => void;
  setApiKey: (key: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

function createDefaultUser(): User {
  const firstProjectId = crypto.randomUUID();
  const defaultPromptFolderId = crypto.randomUUID();
  const defaultAssetFolderId = crypto.randomUUID();

  return {
    username: 'User',
    projects: [
      {
        id: firstProjectId,
        name: 'My First Project',
        customPrompts: [],
        generatedAssets: [],
        referenceAssets: [],
        folders: [
          { id: defaultPromptFolderId, name: 'My Prompts', parentId: null, createdAt: Date.now(), type: 'prompt' },
          { id: defaultAssetFolderId, name: 'Home', parentId: null, createdAt: Date.now(), type: 'asset' },
        ],
        createdAt: Date.now(),
      }
    ],
    activeProjectId: firstProjectId,
    activePromptFolderId: defaultPromptFolderId,
    activeAssetFolderId: defaultAssetFolderId,
  };
}

function loadUserFromStorage(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function saveUserToStorage(user: User): void {
  try {
    // Save a lightweight copy without generated image data URLs (too large for localStorage)
    const lightweight: User = {
      ...user,
      projects: user.projects.map(p => ({
        ...p,
        generatedAssets: p.generatedAssets.map(a => ({
          ...a,
          imageUrl: a.imageUrl.startsWith('data:') ? '' : a.imageUrl,
        })),
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // If still too large, strip reference asset base64 too
      try {
        const minimal: User = {
          ...user,
          projects: user.projects.map(p => ({
            ...p,
            generatedAssets: [],
            referenceAssets: p.referenceAssets.map(a =>
              a.type === 'image' ? { ...a, base64: '', previewUrl: '' } : a
            ),
          })),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
      } catch {
        console.error('Unable to persist user data to localStorage');
      }
    }
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [apiKey, setApiKeyState] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Load on mount
  useEffect(() => {
    const stored = loadUserFromStorage();
    if (stored) {
      setUserState(stored);
    } else {
      setUserState(createDefaultUser());
    }
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    setApiKeyState(localStorage.getItem(API_KEY_STORAGE_KEY) || envKey);
    setIsReady(true);
  }, []);

  // Persist user changes
  useEffect(() => {
    if (isReady && user) {
      saveUserToStorage(user);
    }
  }, [user, isReady]);

  const setUser = useCallback((data: User | null) => {
    setUserState(data);
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  }, []);

  return (
    <AppContext.Provider value={{ user, apiKey, isReady, setUser, setApiKey }}>
      {children}
    </AppContext.Provider>
  );
};
