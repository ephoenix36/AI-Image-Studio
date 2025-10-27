import { useState, useCallback, useEffect } from 'react';

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            // remove "data:mime/type;base64," prefix
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
}

export function sanitizeFilename(text: string): string {
    if (!text) return `untitled_${Date.now()}`;
    // Replace sequences of non-alphanumeric characters (excluding ., -) with a single underscore.
    const sanitized = text
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_');
    // Limit length to avoid issues with filesystems.
    return sanitized.substring(0, 100);
}

export function textToBlob(text: string): File {
    const blob = new Blob([text], { type: 'text/plain' });
    const filename = `description_${new Date().toISOString()}.txt`;
    return new File([blob], filename, { type: 'text/plain' });
}

export function getResolution(url: string): Promise<{width: number, height: number}> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = (err) => reject(err);
        img.src = url;
    });
}


export function useUndoableState<T>(initialState: T): [T, (newState: T, fromInitial?: boolean) => void, () => void, () => void, boolean, boolean] {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const setState = useCallback((newState: T, fromInitial = false) => {
        if (fromInitial) {
            setHistory([newState]);
            setCurrentIndex(0);
            return;
        }
        
        // If the new state is the same as the current state, do nothing.
        if (JSON.stringify(newState) === JSON.stringify(history[currentIndex])) {
            return;
        }

        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(newState);
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
    }, [currentIndex, history]);

    const undo = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }, [currentIndex]);

    const redo = useCallback(() => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    }, [currentIndex, history.length]);

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    return [history[currentIndex], setState, undo, redo, canUndo, canRedo];
}

export function useBodyScrollLock(isOpen: boolean) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
}