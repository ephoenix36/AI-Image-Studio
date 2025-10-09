/**
 * File System Storage Service
 * Uses the File System Access API to store data on the user's device
 * Falls back to localStorage for browsers that don't support it
 */

import type { User } from '../types';

// Check if File System Access API is supported
export const isFileSystemSupported = (): boolean => {
    return 'showDirectoryPicker' in window;
};

// Storage configuration
const STORAGE_FILE_NAME = 'ai-image-studio-data.json';
const ACTIVE_USER_FILE_NAME = 'active-user.txt';

// In-memory cache of directory handle
let directoryHandle: FileSystemDirectoryHandle | null = null;

/**
 * Request permission to access a directory on the user's device
 */
export async function requestStorageDirectory(): Promise<FileSystemDirectoryHandle | null> {
    if (!isFileSystemSupported()) {
        console.warn('File System Access API not supported');
        return null;
    }

    try {
        const handle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents',
        });
        directoryHandle = handle;
        
        // Store the directory handle in IndexedDB for future access
        await saveDirectoryHandle(handle);
        
        return handle;
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            console.log('User cancelled directory selection');
        } else {
            console.error('Error requesting directory:', error);
        }
        return null;
    }
}

/**
 * Save directory handle to IndexedDB for persistence across sessions
 */
async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(handle, 'storageDirectory');
        // Wait for transaction to complete
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error('Error saving directory handle:', error);
    }
}

/**
 * Retrieve stored directory handle from IndexedDB
 */
async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    try {
        const db = await openDB();
        const tx = db.transaction('handles');
        const request = tx.objectStore('handles').get('storageDirectory');
        
        const handle = await new Promise<FileSystemDirectoryHandle | undefined>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        if (handle) {
            // Verify we still have permission
            const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                directoryHandle = handle;
                return handle;
            } else {
                // Request permission again
                const newPermission = await (handle as any).requestPermission({ mode: 'readwrite' });
                if (newPermission === 'granted') {
                    directoryHandle = handle;
                    return handle;
                }
            }
        }
    } catch (error) {
        console.error('Error retrieving directory handle:', error);
    }
    return null;
}

/**
 * Open or create IndexedDB for storing file handles
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AIImageStudioFS', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles');
            }
        };
    });
}

/**
 * Get the current directory handle (from cache or IndexedDB)
 */
async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (directoryHandle) {
        return directoryHandle;
    }
    
    return await getStoredDirectoryHandle();
}

/**
 * Save users data to a file on the device
 */
export async function saveUsersToFile(users: User[]): Promise<{ success: boolean; error?: string }> {
    const handle = await getDirectoryHandle();
    
    if (!handle) {
        return { success: false, error: 'No storage directory selected' };
    }

    try {
        // Create or get the data file
        const fileHandle = await handle.getFileHandle(STORAGE_FILE_NAME, { create: true });
        
        // Create a writable stream
        const writable = await fileHandle.createWritable();
        
        // Write the data
        const jsonData = JSON.stringify(users, null, 2);
        await writable.write(jsonData);
        await writable.close();
        
        return { success: true };
    } catch (error) {
        console.error('Error saving users to file:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Load users data from a file on the device
 */
export async function loadUsersFromFile(): Promise<{ success: boolean; data?: User[]; error?: string }> {
    const handle = await getDirectoryHandle();
    
    if (!handle) {
        return { success: false, error: 'No storage directory selected' };
    }

    try {
        // Get the data file
        const fileHandle = await handle.getFileHandle(STORAGE_FILE_NAME);
        const file = await fileHandle.getFile();
        const text = await file.text();
        
        const users = JSON.parse(text) as User[];
        return { success: true, data: users };
    } catch (error) {
        if ((error as Error).name === 'NotFoundError') {
            // File doesn't exist yet, return empty array
            return { success: true, data: [] };
        }
        console.error('Error loading users from file:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Save active username to a file
 */
export async function saveActiveUserToFile(username: string): Promise<{ success: boolean; error?: string }> {
    const handle = await getDirectoryHandle();
    
    if (!handle) {
        return { success: false, error: 'No storage directory selected' };
    }

    try {
        const fileHandle = await handle.getFileHandle(ACTIVE_USER_FILE_NAME, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(username);
        await writable.close();
        
        return { success: true };
    } catch (error) {
        console.error('Error saving active user to file:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Load active username from a file
 */
export async function loadActiveUserFromFile(): Promise<{ success: boolean; data?: string; error?: string }> {
    const handle = await getDirectoryHandle();
    
    if (!handle) {
        return { success: false, error: 'No storage directory selected' };
    }

    try {
        const fileHandle = await handle.getFileHandle(ACTIVE_USER_FILE_NAME);
        const file = await fileHandle.getFile();
        const username = await file.text();
        
        return { success: true, data: username };
    } catch (error) {
        if ((error as Error).name === 'NotFoundError') {
            return { success: true, data: undefined };
        }
        console.error('Error loading active user from file:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Remove active user file
 */
export async function removeActiveUserFile(): Promise<{ success: boolean; error?: string }> {
    const handle = await getDirectoryHandle();
    
    if (!handle) {
        return { success: false, error: 'No storage directory selected' };
    }

    try {
        await handle.removeEntry(ACTIVE_USER_FILE_NAME);
        return { success: true };
    } catch (error) {
        if ((error as Error).name === 'NotFoundError') {
            return { success: true }; // Already doesn't exist
        }
        console.error('Error removing active user file:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Check if storage is configured (directory selected)
 */
export async function isStorageConfigured(): Promise<boolean> {
    const handle = await getDirectoryHandle();
    return handle !== null;
}

/**
 * Get the name of the storage directory
 */
export async function getStorageDirectoryName(): Promise<string | null> {
    const handle = await getDirectoryHandle();
    return handle ? handle.name : null;
}

/**
 * Clear the stored directory handle (user wants to change location)
 */
export async function clearStorageLocation(): Promise<void> {
    directoryHandle = null;
    try {
        const db = await openDB();
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').delete('storageDirectory');
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error('Error clearing storage location:', error);
    }
}

/**
 * Export data to a downloadable file (backup)
 */
export function exportDataAsDownload(users: User[], filename: string = 'ai-image-studio-backup.json'): void {
    const jsonData = JSON.stringify(users, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Import data from an uploaded file (restore backup)
 */
export async function importDataFromFile(file: File): Promise<{ success: boolean; data?: User[]; error?: string }> {
    try {
        const text = await file.text();
        const users = JSON.parse(text) as User[];
        return { success: true, data: users };
    } catch (error) {
        console.error('Error importing data:', error);
        return { success: false, error: (error as Error).message };
    }
}
