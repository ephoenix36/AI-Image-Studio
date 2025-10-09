/**
 * Hybrid Storage Service
 * Automatically uses File System Access API when available,
 * falls back to localStorage for compatibility
 */

import type { User } from '../types';
import * as FileStorage from './fileSystemStorage';

export type StorageMode = 'filesystem' | 'localstorage';

// Storage keys for localStorage fallback
const LOCALSTORAGE_USERS_KEY = 'aiImageStudioUsers';
const LOCALSTORAGE_ACTIVE_USER_KEY = 'aiImageStudioActiveUser';

/**
 * Get the current storage mode
 */
export async function getStorageMode(): Promise<StorageMode> {
    if (FileStorage.isFileSystemSupported() && await FileStorage.isStorageConfigured()) {
        return 'filesystem';
    }
    return 'localstorage';
}

/**
 * Initialize storage - request directory if using file system
 */
export async function initializeStorage(): Promise<{ success: boolean; mode: StorageMode; error?: string }> {
    // Check if file system is supported
    if (!FileStorage.isFileSystemSupported()) {
        return { success: true, mode: 'localstorage' };
    }

    // Check if already configured
    if (await FileStorage.isStorageConfigured()) {
        return { success: true, mode: 'filesystem' };
    }

    // Check if there's existing data in localStorage that should be migrated
    const hasLocalStorageData = !!localStorage.getItem(LOCALSTORAGE_USERS_KEY);
    
    if (hasLocalStorageData) {
        // Don't auto-prompt if user has data - let them decide when to migrate
        // They can use the Settings UI to migrate when ready
        return { success: true, mode: 'localstorage' };
    }

    // No data yet - proactively request directory selection for new users
    const handle = await FileStorage.requestStorageDirectory();
    if (handle) {
        return { success: true, mode: 'filesystem' };
    }

    // User cancelled - fallback to localStorage
    return { success: true, mode: 'localstorage' };
}

/**
 * Save users data
 */
export async function saveUsers(users: User[]): Promise<{ success: boolean; error?: string }> {
    const mode = await getStorageMode();

    if (mode === 'filesystem') {
        return await FileStorage.saveUsersToFile(users);
    } else {
        // localStorage fallback
        try {
            localStorage.setItem(LOCALSTORAGE_USERS_KEY, JSON.stringify(users));
            return { success: true };
        } catch (error) {
            const errorMessage = (error as Error).message;
            
            // Check if it's a quota error
            if ((error as Error).name === 'QuotaExceededError' || errorMessage.includes('quota')) {
                if (FileStorage.isFileSystemSupported()) {
                    return { 
                        success: false, 
                        error: 'Browser storage quota exceeded (5-10MB limit). Please switch to file system storage in Settings for unlimited space.' 
                    };
                } else {
                    return { 
                        success: false, 
                        error: 'Browser storage quota exceeded. Please delete old images or clear browser data.' 
                    };
                }
            }
            
            return { success: false, error: errorMessage };
        }
    }
}

/**
 * Load users data
 */
export async function loadUsers(): Promise<{ success: boolean; data?: User[]; error?: string }> {
    const mode = await getStorageMode();

    if (mode === 'filesystem') {
        return await FileStorage.loadUsersFromFile();
    } else {
        // localStorage fallback
        try {
            const data = localStorage.getItem(LOCALSTORAGE_USERS_KEY);
            const users = data ? JSON.parse(data) as User[] : [];
            return { success: true, data: users };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}

/**
 * Save active username
 */
export async function saveActiveUser(username: string): Promise<{ success: boolean; error?: string }> {
    const mode = await getStorageMode();

    if (mode === 'filesystem') {
        return await FileStorage.saveActiveUserToFile(username);
    } else {
        // localStorage fallback
        try {
            localStorage.setItem(LOCALSTORAGE_ACTIVE_USER_KEY, username);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}

/**
 * Load active username
 */
export async function loadActiveUser(): Promise<{ success: boolean; data?: string; error?: string }> {
    const mode = await getStorageMode();

    if (mode === 'filesystem') {
        return await FileStorage.loadActiveUserFromFile();
    } else {
        // localStorage fallback
        try {
            const username = localStorage.getItem(LOCALSTORAGE_ACTIVE_USER_KEY);
            return { success: true, data: username || undefined };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}

/**
 * Remove active user
 */
export async function removeActiveUser(): Promise<{ success: boolean; error?: string }> {
    const mode = await getStorageMode();

    if (mode === 'filesystem') {
        return await FileStorage.removeActiveUserFile();
    } else {
        // localStorage fallback
        try {
            localStorage.removeItem(LOCALSTORAGE_ACTIVE_USER_KEY);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}

/**
 * Check if storage is configured
 */
export async function isStorageConfigured(): Promise<boolean> {
    if (FileStorage.isFileSystemSupported()) {
        return await FileStorage.isStorageConfigured();
    }
    return true; // localStorage is always available
}

/**
 * Get storage location info
 */
export async function getStorageInfo(): Promise<{
    mode: StorageMode;
    location?: string;
    supported: boolean;
}> {
    const mode = await getStorageMode();
    const supported = FileStorage.isFileSystemSupported();
    
    if (mode === 'filesystem') {
        const location = await FileStorage.getStorageDirectoryName();
        return { mode, location: location || 'Unknown', supported };
    }
    
    return { mode, location: 'Browser Storage', supported };
}

/**
 * Request to change storage location
 */
export async function changeStorageLocation(): Promise<{ success: boolean; error?: string }> {
    if (!FileStorage.isFileSystemSupported()) {
        return { success: false, error: 'File System Access API not supported' };
    }

    // Clear current location
    await FileStorage.clearStorageLocation();
    
    // Request new location
    const handle = await FileStorage.requestStorageDirectory();
    if (handle) {
        return { success: true };
    }
    
    return { success: false, error: 'No directory selected' };
}

/**
 * Migrate data from localStorage to file system
 */
export async function migrateToFileSystem(): Promise<{ success: boolean; error?: string }> {
    if (!FileStorage.isFileSystemSupported()) {
        return { success: false, error: 'File System Access API not supported' };
    }

    try {
        // Load from localStorage
        const usersData = localStorage.getItem(LOCALSTORAGE_USERS_KEY);
        const activeUserData = localStorage.getItem(LOCALSTORAGE_ACTIVE_USER_KEY);
        
        if (!usersData) {
            return { success: false, error: 'No data to migrate' };
        }

        const users = JSON.parse(usersData) as User[];
        
        // Request directory
        const handle = await FileStorage.requestStorageDirectory();
        if (!handle) {
            return { success: false, error: 'No directory selected' };
        }

        // Save to file system
        const saveResult = await FileStorage.saveUsersToFile(users);
        if (!saveResult.success) {
            return saveResult;
        }

        if (activeUserData) {
            await FileStorage.saveActiveUserToFile(activeUserData);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Export data as downloadable file
 */
export async function exportData(filename?: string): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await loadUsers();
        if (!result.success || !result.data) {
            return { success: false, error: result.error || 'No data to export' };
        }

        FileStorage.exportDataAsDownload(result.data, filename);
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Import data from file
 */
export async function importData(file: File): Promise<{ success: boolean; data?: User[]; error?: string }> {
    return await FileStorage.importDataFromFile(file);
}
