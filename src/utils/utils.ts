import { useState, useCallback, useEffect, useReducer } from 'react';

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


type UndoableAction<T> = 
    | { type: 'SET'; payload: T; fromInitial?: boolean }
    | { type: 'SET_FUNCTION'; updater: (prev: T) => T }
    | { type: 'UNDO' }
    | { type: 'REDO' };

type UndoableState<T> = {
    history: T[];
    currentIndex: number;
};

function undoableReducer<T>(state: UndoableState<T>, action: UndoableAction<T>): UndoableState<T> {
    switch (action.type) {
        case 'SET': {
            if (action.fromInitial) {
                return {
                    history: [action.payload],
                    currentIndex: 0
                };
            }
            
            const currentState = state.history[state.currentIndex];
            // If the new state is the same as the current state, do nothing
            if (JSON.stringify(action.payload) === JSON.stringify(currentState)) {
                return state;
            }
            
            const newHistory = state.history.slice(0, state.currentIndex + 1);
            newHistory.push(action.payload);
            return {
                history: newHistory,
                currentIndex: newHistory.length - 1
            };
        }
        
        case 'SET_FUNCTION': {
            const currentState = state.history[state.currentIndex];
            const newState = action.updater(currentState);
            
            // If the new state is the same as the current state, do nothing
            if (JSON.stringify(newState) === JSON.stringify(currentState)) {
                return state;
            }
            
            const newHistory = state.history.slice(0, state.currentIndex + 1);
            newHistory.push(newState);
            return {
                history: newHistory,
                currentIndex: newHistory.length - 1
            };
        }
        
        case 'UNDO': {
            if (state.currentIndex > 0) {
                return {
                    ...state,
                    currentIndex: state.currentIndex - 1
                };
            }
            return state;
        }
        
        case 'REDO': {
            if (state.currentIndex < state.history.length - 1) {
                return {
                    ...state,
                    currentIndex: state.currentIndex + 1
                };
            }
            return state;
        }
        
        default:
            return state;
    }
}

export function useUndoableState<T>(initialState: T): [T, (newState: T | ((prev: T) => T), fromInitial?: boolean) => void, () => void, () => void, boolean, boolean] {
    const [state, dispatch] = useReducer(undoableReducer<T>, {
        history: [initialState],
        currentIndex: 0
    });

    const setState = useCallback((newState: T | ((prev: T) => T), fromInitial = false) => {
        if (typeof newState === 'function') {
            dispatch({ type: 'SET_FUNCTION', updater: newState as (prev: T) => T });
        } else {
            dispatch({ type: 'SET', payload: newState, fromInitial });
        }
    }, []);

    const undo = useCallback(() => {
        dispatch({ type: 'UNDO' });
    }, []);

    const redo = useCallback(() => {
        dispatch({ type: 'REDO' });
    }, []);

    const canUndo = state.currentIndex > 0;
    const canRedo = state.currentIndex < state.history.length - 1;

    return [state.history[state.currentIndex], setState, undo, redo, canUndo, canRedo];
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