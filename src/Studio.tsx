
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { tips, MEDIA_CATEGORIES, ICONS, DEFAULT_DESCRIPTIONS, ASPECT_RATIOS } from '@/constants';
import type { GeneratedAsset, Tip, Notification, ReferenceImage, LoadingState, User, Project, MediaType, ReferenceAsset, CustomPrompt, Folder, CustomPromptHistory } from '@/types/types';

import { Icon } from '@/components/Icon';
import { Tooltip } from '@/components/Tooltip';
import { PromptCard } from '@/components/PromptCard';
import { SectionHeader } from '@/components/SectionHeader';
import { PhotoGallery } from '@/components/PhotoGallery';
import { ImageViewer } from '@/components/ImageViewer';
import { WizardModal } from '@/components/WizardModal';
import { CoffeeModal } from '@/components/CoffeeModal';
import { NotificationToast } from '@/components/NotificationToast';
import { AuthScreen } from '@/components/AuthScreen';
import { ImageEditorModal } from '@/ImageEditorModal';
import { SettingsModal } from '@/components/SettingsModal';
import { ReferenceAssetSelectorModal } from '@/components/ReferenceAssetSelectorModal';
import { FolderTree } from '@/components/FolderTree';
import { AssetPreview } from '@/components/AssetPreview';
import { BatchEditorModal } from '@/components/BatchEditorModal';

import { useAuth } from '@/contexts/AuthContext';
import { generateImage } from '@/services/geminiService';
import { blobToBase64, sanitizeFilename, textToBlob, getResolution, useUndoableState, useBodyScrollLock } from '@/utils/utils';


// --- MODAL COMPONENTS ---

const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    confirmText?: string;
    cancelText?: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, onConfirm, title, confirmText = "Confirm", cancelText = "Cancel", children }) => {
    useBodyScrollLock(isOpen);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[80]" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-semibold">{title}</h2>
                </div>
                <div className="p-6 text-slate-300">
                    {children}
                </div>
                <div className="p-4 flex justify-end gap-3 bg-slate-900/40 rounded-b-2xl">
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition">{cancelText}</button>
                    <button onClick={onConfirm} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-md transition">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const RenameModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (newName: string, projectId?: string) => void;
    title: string;
    initialName: string;
    saveText?: string;
    showProjectSelector?: boolean;
    projects?: Project[];
    currentProjectId?: string;
}> = ({ isOpen, onClose, onSave, title, initialName, saveText = "Save", showProjectSelector = false, projects = [], currentProjectId }) => {
    useBodyScrollLock(isOpen);
    
    const [name, setName] = useState(initialName);
    const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId || '');

    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setSelectedProjectId(currentProjectId || '');
        }
    }, [isOpen, initialName, currentProjectId]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim(), showProjectSelector ? selectedProjectId : undefined);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[80]" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-semibold">{title}</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm text-slate-300 mb-1 block">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                            className="w-full bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2"
                            autoFocus
                        />
                    </div>
                    {showProjectSelector && projects.length > 0 && (
                        <div>
                            <label className="text-sm text-slate-300 mb-1 block">Move to Project</label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="w-full bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2"
                            >
                                {projects.map(proj => (
                                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="p-4 flex justify-end gap-3 bg-slate-900/40 rounded-b-2xl">
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition">Cancel</button>
                    <button onClick={handleSave} disabled={!name.trim() || name.trim() === initialName} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed">{saveText}</button>
                </div>
            </div>
        </div>
    );
};


// Main App Component
export default function Studio() {
    const { currentUser, userData, updateUserData, logout } = useAuth();
    
    // Using a single state object for the entire user session
    const [user, setUserWithHistory, undoUser, redoUser, canUndo, canRedo] = useUndoableState<User | null>(userData);
    const setUser = (u: User | null | ((prev: User | null) => User | null), fromInitial = false) => {
        setUserWithHistory(u, fromInitial);
        // Sync with Firestore when user data changes
        if (u && typeof u !== 'function') {
            updateUserData(u);
        }
    };
    
    // Sync userData from auth context with local state
    useEffect(() => {
        if (userData && !user) {
            setUser(userData, true);
        }
    }, [userData]);

    // Local UI State
    const [subjectDescription, setSubjectDescription] = useState("a high-end, solar-powered watch with a leather strap");
    const [hasUserEditedDescription, setHasUserEditedDescription] = useState(false);
    
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchGenerationCount, setBatchGenerationCount] = useState(1);
    const [showAllPreviews, setShowAllPreviews] = useState(true);
    const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
    const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
    const [newPrompt, setNewPrompt] = useState("");
    
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({ "Prompting Tips": true });
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isCoffeeModalOpen, setIsCoffeeModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isReferenceSelectorOpen, setIsReferenceSelectorOpen] = useState<string | null>(null);
    const [lightboxConfig, setLightboxConfig] = useState<{ isOpen: boolean, asset: GeneratedAsset | ReferenceImage | null, source: 'generated' | 'reference' }>({ isOpen: false, asset: null, source: 'generated' });
    const [editorConfig, setEditorConfig] = useState<{ isOpen: boolean, asset: GeneratedAsset | ReferenceImage | null }>({ isOpen: false, asset: null });
    const [isBatchEditorOpen, setIsBatchEditorOpen] = useState(false);
    
    const lastPromptSelectedIndex = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMediaType, setSelectedMediaType] = useState<MediaType>("Custom");

    // Modal States
    const [renameTarget, setRenameTarget] = useState<{ type: 'project' | 'folder', id: string | null, name: string, folderType?: 'prompt' | 'asset', parentId?: string | null } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'folder', id: string | null, name: string, folderType?: 'prompt' | 'asset' } | null>(null);
    const [deleteAssetsTarget, setDeleteAssetsTarget] = useState<string[] | null>(null);

    // Settings state
    const [defaultAspectRatio, setDefaultAspectRatio] = useState("1:1");
    const [devMode, setDevMode] = useState(false);
    const [confirmOnDelete, setConfirmOnDelete] = useState(true);

    // Collapsible state
    const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);


    // Memoized derived state for performance and clarity
    const activeProject = useMemo(() => user?.projects.find(p => p.id === user.activeProjectId), [user]);
    const activePromptFolderId = useMemo(() => user?.activePromptFolderId, [user]);
    const activeAssetFolderId = useMemo(() => user?.activeAssetFolderId, [user]);

    const promptCategories = useMemo(() => MEDIA_CATEGORIES[selectedMediaType] || [], [selectedMediaType]);
    
    // Filtered data based on active project and folder
    const visibleCustomPrompts = useMemo(() => activeProject?.customPrompts.filter(p => p.folderId === activePromptFolderId) || [], [activeProject, activePromptFolderId]);
    const visibleReferenceAssets = useMemo(() => activeProject?.referenceAssets.filter(a => a.folderId === activeAssetFolderId) || [], [activeProject, activeAssetFolderId]);
    const assetFolders = useMemo(() => activeProject?.folders.filter(f => f.type === 'asset') || [], [activeProject]);
    const promptFolders = useMemo(() => activeProject?.folders.filter(f => f.type === 'prompt') || [], [activeProject]);


    const allPrompts = useMemo(() => {
        const defaultPrompts: CustomPrompt[] = promptCategories.flatMap(c => c.prompts.map(p_text => {
            const name = p_text.split(',')[0].replace(' of [subject]', '').replace('Photorealistic', '').replace('A ', '').trim();
            return {
                id: p_text,
                name: name.length > 50 ? name.substring(0, 50) + '...' : name,
                version: '1.0',
                text: p_text,
                tags: [],
                folderId: null,
                referenceAssetIds: [],
                createdAt: 0 
            };
        }));
        return [...(activeProject?.customPrompts || []), ...defaultPrompts];
    }, [activeProject?.customPrompts, promptCategories]);
    
    // Search Filtered Prompts
    const filteredCustomPrompts = useMemo(() => visibleCustomPrompts
        .filter(p => p.text.toLowerCase().includes(searchTerm.toLowerCase()) || p.name.toLowerCase().includes(searchTerm.toLowerCase())), [visibleCustomPrompts, searchTerm]);

    const filteredPromptCategories = useMemo(() => promptCategories.map(cat => ({
        ...cat,
        prompts: cat.prompts.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
    })).filter(cat => cat.prompts.length > 0), [promptCategories, searchTerm]);

    const allVisiblePromptIds = useMemo(() => {
        const customIds = filteredCustomPrompts.map(p => p.id);
        const categoryIds = filteredPromptCategories.flatMap(c => c.prompts);
        return [...customIds, ...categoryIds];
    }, [filteredCustomPrompts, filteredPromptCategories]);

    const promptsToAddCount = useMemo(() => newPrompt.split('\n').map(p => p.trim()).filter(p => p.length > 0).length, [newPrompt]);

    const selectedAssetsForBatchEdit = useMemo(() =>
        activeProject?.generatedAssets.filter(a => selectedImageIds.has(a.id)) || [],
        [activeProject?.generatedAssets, selectedImageIds]
    );

    const filteredCustomPromptIds = useMemo(() => filteredCustomPrompts.map(p => p.id), [filteredCustomPrompts]);
    const customPromptsSelectionCount = useMemo(() => filteredCustomPromptIds.filter(id => selectedPrompts.includes(id)).length, [filteredCustomPromptIds, selectedPrompts]);
    const customPromptsSelectionState = useMemo(() => {
        if (filteredCustomPromptIds.length === 0) return 'none';
        if (customPromptsSelectionCount === 0) return 'none';
        if (customPromptsSelectionCount === filteredCustomPromptIds.length) return 'all';
        return 'some';
    }, [customPromptsSelectionCount, filteredCustomPromptIds.length]);

    useEffect(() => {
        lastPromptSelectedIndex.current = null;
    }, [allVisiblePromptIds]);


    // Load user from localStorage on initial mount
    useEffect(() => {
        const activeUser = localStorage.getItem('aiImageStudioActiveUser');
        if (activeUser) {
            const users: User[] = JSON.parse(localStorage.getItem('aiImageStudioUsers') || '[]');
            let currentUser = users.find(u => u.username === activeUser);
            if (currentUser) {
                // Data migration for folder separation
                if (typeof (currentUser as any).activeFolderId !== 'undefined') {
                    const migratedUser = { ...currentUser };
                    migratedUser.projects = migratedUser.projects.map(p => {
                        let hasAssetFolder = false;
                        const migratedFolders = p.folders.map(f => {
                            if (!f.type) {
                                (f as Folder).type = 'prompt';
                            }
                            if (f.type === 'asset') hasAssetFolder = true;
                            return f as Folder;
                        });

                        if (!hasAssetFolder) {
                            migratedFolders.push({ id: crypto.randomUUID(), name: 'All Images', parentId: null, createdAt: Date.now(), type: 'asset' });
                        }
                        return { ...p, folders: migratedFolders };
                    });

                    const firstAssetFolder = migratedUser.projects.find(p => p.id === migratedUser.activeProjectId)?.folders.find(f => f.type === 'asset');

                    (migratedUser as any).activePromptFolderId = (currentUser as any).activeFolderId;
                    (migratedUser as any).activeAssetFolderId = firstAssetFolder?.id || null;
                    delete (migratedUser as any).activeFolderId;

                    currentUser = migratedUser;
                }

                // Data migration for CustomPrompt structure
                currentUser.projects = currentUser.projects.map(p => ({
                    ...p,
                    customPrompts: p.customPrompts.map(prompt => {
                        if (prompt && typeof (prompt as any).name === 'undefined') {
                            const oldPrompt = prompt as any;
                            const name = oldPrompt.text.split(',')[0].trim();
                            return {
                                ...oldPrompt,
                                name: name.length > 50 ? name.substring(0, 50) + '...' : name,
                                version: '1.0',
                                tags: [],
                                createdAt: oldPrompt.createdAt || Date.now()
                            };
                        }
                        return prompt as CustomPrompt;
                    })
                }));
                
                // Ensure activeProjectId and folder IDs are valid
                const projectExists = currentUser.projects.some(p => p.id === currentUser.activeProjectId);
                if (!projectExists) currentUser.activeProjectId = currentUser.projects[0]?.id || null;

                const activeProj = currentUser.projects.find(p => p.id === currentUser.activeProjectId);
                const promptFolderExists = activeProj?.folders.some(f => f.type === 'prompt' && f.id === currentUser.activePromptFolderId);
                if (!promptFolderExists) currentUser.activePromptFolderId = activeProj?.folders.find(f => f.type === 'prompt')?.id || null;

                const assetFolderExists = activeProj?.folders.some(f => f.type === 'asset' && f.id === currentUser.activeAssetFolderId);
                if (!assetFolderExists) currentUser.activeAssetFolderId = activeProj?.folders.find(f => f.type === 'asset')?.id || null;
                
                setUser(currentUser, true);
            }
        }
    }, []);

    // Persist user data to localStorage whenever it changes
    useEffect(() => {
        if (user) {
            try {
                const users: User[] = JSON.parse(localStorage.getItem('aiImageStudioUsers') || '[]');
                const userIndex = users.findIndex(u => u.username === user.username);
                
                // Create a lightweight version without generated images (they're too large for localStorage)
                const lightweightUser = {
                    ...user,
                    projects: user.projects.map(p => ({
                        ...p,
                        generatedAssets: [], // Don't persist generated images - they exceed localStorage quota
                        referenceAssets: p.referenceAssets // Reference assets are user-uploaded, keep them
                    }))
                };
                
                if (userIndex > -1) users[userIndex] = lightweightUser;
                else users.push(lightweightUser);
                
                localStorage.setItem('aiImageStudioUsers', JSON.stringify(users));
                localStorage.setItem('aiImageStudioActiveUser', user.username);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                    console.error('localStorage quota exceeded. Clearing old data...');
                    // Try to clear and save again without images
                    try {
                        const lightweightUser = {
                            ...user,
                            projects: user.projects.map(p => ({
                                ...p,
                                generatedAssets: [],
                                referenceAssets: [] // Also clear reference assets if still too large
                            }))
                        };
                        localStorage.setItem('aiImageStudioUsers', JSON.stringify([lightweightUser]));
                        localStorage.setItem('aiImageStudioActiveUser', user.username);
                        addNotification('Storage limit reached. Generated images will not persist across sessions.', 'error');
                    } catch (e) {
                        console.error('Failed to save to localStorage even after clearing:', e);
                        addNotification('Unable to save data. Please clear browser storage.', 'error');
                    }
                } else {
                    console.error('Error saving to localStorage:', error);
                }
            }
        } else {
            localStorage.removeItem('aiImageStudioActiveUser');
        }
    }, [user]);
    
    useEffect(() => {
        if (!hasUserEditedDescription) {
            setSubjectDescription(DEFAULT_DESCRIPTIONS[selectedMediaType] || "");
        }
    }, [selectedMediaType, hasUserEditedDescription]);
    
    const updateUser = useCallback((updater: (u: User) => User) => {
        setUserWithHistory(prevUser => {
            if (!prevUser) return prevUser;
            return updater(prevUser);
        });
    }, [setUserWithHistory]);

    const updateActiveProject = useCallback((updater: (p: Project) => Project) => {
        updateUser(u => {
            const activeProjectId = u.activeProjectId;
            if (!activeProjectId) return u;
            return {
                ...u,
                projects: u.projects.map(p => p.id === activeProjectId ? updater(p) : p)
            };
        });
    }, [updateUser]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isModalOpen = isGalleryOpen || isWizardOpen || editorConfig.isOpen || lightboxConfig.isOpen || isSettingsOpen || isReferenceSelectorOpen || isBatchEditorOpen || renameTarget || deleteTarget;

            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || isModalOpen) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z' && !e.shiftKey;
            const isRedo = (isMac ? e.metaKey : e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey));

            if (isUndo && canUndo) {
                e.preventDefault();
                undoUser();
            }
            if (isRedo && canRedo) {
                e.preventDefault();
                redoUser();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [undoUser, redoUser, canUndo, canRedo, isGalleryOpen, isWizardOpen, editorConfig.isOpen, lightboxConfig.isOpen, isSettingsOpen, isReferenceSelectorOpen, isBatchEditorOpen, renameTarget, deleteTarget]);

    const anyLoading = useMemo(() => Object.values(loadingStates).some((s: LoadingState) => s.isLoading), [loadingStates]);

    const addNotification = useCallback((message: string, type: 'info' | 'error' = 'info') => {
        const id = crypto.randomUUID();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
    }, []);

    const handleStopGeneration = useCallback((promptId: string) => {
        if (loadingStates[promptId]?.controller) {
            loadingStates[promptId].controller.abort();
            addNotification(`Generation stopped for prompt.`, 'info');
        }
    }, [loadingStates, addNotification]);

    const handleStopAll = useCallback(() => {
        Object.keys(loadingStates).forEach(handleStopGeneration);
        addNotification('All active generations stopped.', 'info');
    }, [loadingStates, handleStopGeneration]);

    const handleGenerateImage = useCallback(async (promptText: string, promptId: string) => {
        if (!subjectDescription.trim() && promptText.includes("[subject]")) { 
            addNotification("Please enter a subject description.", 'error'); return;
        }
        if (!activeProject) return;
        
        const controller = new AbortController();
        setLoadingStates(prev => ({ ...prev, [promptId]: { isLoading: true, controller } }));

        try {
            const finalPrompt = promptText.replace(/\[subject\]/g, subjectDescription);
            const prompt = allPrompts.find(p => p.id === promptId);
            const promptRefIds = prompt?.referenceAssetIds || [];
            
            const referenceImages: ReferenceImage[] = [];
            
            // Get from referenceAssets (already have base64)
            const refAssetImages = activeProject.referenceAssets
                .filter(a => a.type === 'image' && promptRefIds.includes(a.id)) as ReferenceImage[];
            referenceImages.push(...refAssetImages);

            // Get from generatedAssets, fetch, and convert
            const genAssetRefs = activeProject.generatedAssets.filter(a => promptRefIds.includes(a.id));

            if (genAssetRefs.length > 0) {
                addNotification(`Preparing ${genAssetRefs.length} generated image(s) as references...`, 'info');
                const genAssetPromises = genAssetRefs.map(async (asset) => {
                    try {
                        const response = await fetch(asset.imageUrl);
                        const blob = await response.blob();
                        const base64 = await blobToBase64(blob);
                        return {
                            id: asset.id, type: 'image' as const, base64, mimeType: blob.type,
                            name: asset.name, previewUrl: asset.imageUrl, folderId: asset.folderId,
                            createdAt: asset.createdAt
                        };
                    } catch (e) {
                        console.error(`Failed to load generated asset ${asset.id} as reference`, e);
                        addNotification(`Could not load reference: ${asset.name}`, 'error');
                        return null;
                    }
                });
                
                const resolvedGenAssets = (await Promise.all(genAssetPromises)).filter(Boolean);
                referenceImages.push(...resolvedGenAssets as ReferenceImage[]);
            }

            const aspectRatio = prompt?.aspectRatio || defaultAspectRatio;

            const result = await generateImage(finalPrompt, referenceImages, aspectRatio, controller.signal);
            if (result.imageUrl) {
                const resolution = await getResolution(result.imageUrl);
                const newAsset: GeneratedAsset = {
                    id: crypto.randomUUID(), imageUrl: result.imageUrl, prompt: finalPrompt,
                    subject: subjectDescription, name: sanitizeFilename(finalPrompt), promptId: promptId,
                    createdAt: Date.now(), aspectRatio: aspectRatio, tags: [],
                    folderId: activeAssetFolderId, resolution, referenceAssetIds: promptRefIds,
                };
                // Use functional update to prevent race condition when multiple images generate simultaneously
                updateActiveProject(p => {
                    const newProj = { ...p, generatedAssets: [...p.generatedAssets, newAsset] };
                    
                    // Show a one-time notification about session-only storage
                    if (p.generatedAssets.length === 0 && !localStorage.getItem('hasShownStorageWarning')) {
                        localStorage.setItem('hasShownStorageWarning', 'true');
                        addNotification('💡 Tip: Generated images exist only during this session. Use Gallery > Download to save them!', 'info');
                    }
                    
                    return newProj;
                });
            } else if (result.error) { throw new Error(result.error); }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                 console.error("Error generating image:", error);
                 addNotification(error.message || 'An unknown error occurred.', 'error');
            }
        } finally {
             setLoadingStates(prev => { const newStates = {...prev}; delete newStates[promptId]; return newStates; });
        }
    }, [subjectDescription, activeProject, allPrompts, addNotification, activeAssetFolderId, defaultAspectRatio, updateActiveProject]);
    
    const handleSimulateImage = async (promptText: string, promptId: string) => {
        addNotification("Simulating image generation...", "info");
        const prompt = allPrompts.find(p => p.id === promptId);
        const finalPrompt = promptText.replace(/\[subject\]/g, subjectDescription);
        const aspectRatio = prompt?.aspectRatio || defaultAspectRatio;
        const [w, h] = aspectRatio.split(':').map(Number);
        const ratio = w / h;
        const width = 512;
        const height = Math.round(width / ratio);
        
        const controller = new AbortController();
        setLoadingStates(prev => ({ ...prev, [promptId]: { isLoading: true, controller } }));
        
        const imageUrl = `https://picsum.photos/${width}/${height}?random=${Math.random()}`;
        
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const dataUrl = URL.createObjectURL(blob);
        
        const resolution = await getResolution(dataUrl);

        const newAsset: GeneratedAsset = {
            id: crypto.randomUUID(), imageUrl: dataUrl, prompt: finalPrompt, subject: subjectDescription,
            name: sanitizeFilename(finalPrompt), promptId: promptId, createdAt: Date.now(),
            aspectRatio: aspectRatio, tags: ['simulated'], folderId: activeAssetFolderId,
            resolution, referenceAssetIds: prompt?.referenceAssetIds
        };
        
        // Show loading for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateActiveProject(p => ({ ...p, generatedAssets: [...p.generatedAssets, newAsset] }));
        setLoadingStates(prev => { const newStates = {...prev}; delete newStates[promptId]; return newStates; });
    }

    const handleBatchGenerate = async (promptIds: string[]) => {
        if (promptIds.length === 0) { addNotification("Please select prompts for batch generation.", 'error'); return; }
        const promptsToGenerate = allPrompts.filter(p => promptIds.includes(p.id));
        const generationFunction = devMode ? handleSimulateImage : handleGenerateImage;
        const generationTasks = promptsToGenerate.flatMap(p => 
            Array.from({ length: batchGenerationCount }, () => generationFunction(p.text, p.id))
        );
        await Promise.all(generationTasks);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text.replace(/\[subject\]/g, subjectDescription))
            .then(() => addNotification('Prompt copied!'))
            .catch(() => addNotification('Failed to copy prompt.', 'error'));
    };

    const handleWizardGenerate = (promptsToAdd: string[], replace: boolean) => {
        if (promptsToAdd.length === 0) return;
        const newCustomPrompts: CustomPrompt[] = promptsToAdd.map(text => ({
            id: crypto.randomUUID(),
            name: text.length > 50 ? text.substring(0, 50) + '...' : text,
            version: '1.0',
            text,
            tags: [],
            folderId: activePromptFolderId,
            referenceAssetIds: [],
            createdAt: Date.now()
        }));
        
        updateActiveProject(p => {
            let existingPrompts = p.customPrompts;
            if (replace) {
                // Keep prompts that are NOT in the active folder
                existingPrompts = p.customPrompts.filter(cp => cp.folderId !== activePromptFolderId);
            }
            return { ...p, customPrompts: [...existingPrompts, ...newCustomPrompts] };
        });

        addNotification(`${replace ? `Replaced current folder's prompts with ${promptsToAdd.length} new ones.` : `Added ${promptsToAdd.length} new prompt(s).`}`);
    };

    const handlePromptSelection = (promptId: string, e: React.MouseEvent, index: number) => {
        if (e.shiftKey && lastPromptSelectedIndex.current !== null) {
            const start = Math.min(lastPromptSelectedIndex.current, index);
            const end = Math.max(lastPromptSelectedIndex.current, index);
            const idsToSelect = allVisiblePromptIds.slice(start, end + 1);
            setSelectedPrompts(prev => [...new Set([...prev, ...idsToSelect])]);
        } else {
            setSelectedPrompts(prev => {
                const newSet = new Set(prev);
                if (newSet.has(promptId)) newSet.delete(promptId);
                else newSet.add(promptId);
                return Array.from(newSet);
            });
            lastPromptSelectedIndex.current = index;
        }
    };

    const handleSelectAllInCategory = (promptIds: string[]) => {
        const allSelected = promptIds.every(id => selectedPrompts.includes(id));
        setSelectedPrompts(prev => allSelected ? prev.filter(id => !promptIds.includes(id)) : [...new Set([...prev, ...promptIds])]);
    };
    
    const handleSelectAllCustomPrompts = () => {
        const allSelected = customPromptsSelectionState === 'all';
        if (allSelected) {
            setSelectedPrompts(prev => prev.filter(id => !filteredCustomPromptIds.includes(id)));
        } else {
            setSelectedPrompts(prev => [...new Set([...prev, ...filteredCustomPromptIds])]);
        }
    };

    const handleGenerateSelectedCustomPrompts = () => {
        const idsToGenerate = selectedPrompts.filter(id => filteredCustomPromptIds.includes(id));
        handleBatchGenerate(idsToGenerate);
    };

    const processFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;
        addNotification(`Processing ${files.length} file(s)...`, 'info');
        const newAssets: ReferenceAsset[] = [];
        try {
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    const base64 = await blobToBase64(file);
                    newAssets.push({
                        id: crypto.randomUUID(), type: 'image', base64: base64,
                        mimeType: file.type, name: file.name, previewUrl: `data:${file.type};base64,${base64}`, folderId: activeAssetFolderId, createdAt: Date.now(),
                    });
                } else if (file.type.startsWith('text/') || file.type === 'application/pdf') {
                    newAssets.push({
                        id: crypto.randomUUID(), type: 'document', content: await file.text(),
                        name: file.name, mimeType: file.type, folderId: activeAssetFolderId, createdAt: Date.now(),
                    });
                } else { addNotification(`File type not supported: ${file.name}`, 'error'); }
            }
            if (newAssets.length > 0) {
                updateActiveProject(p => ({...p, referenceAssets: [...p.referenceAssets, ...newAssets]}));
                addNotification(`Added ${newAssets.length} reference asset(s).`, 'info');
            }
        } catch (e: any) { 
            console.error("Error processing files:", e);
            addNotification(`Error processing files: ${e.message}`, 'error'); 
        }
    }, [addNotification, updateActiveProject, activeAssetFolderId]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) processFiles(Array.from(event.target.files));
        event.target.value = '';
    };

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
        processFiles(Array.from(e.dataTransfer.files));
    }, [processFiles]);
    
    const handleSubjectChange = (text: string) => {
        setSubjectDescription(text);
        setHasUserEditedDescription(true);
        if (text.length > 2000) {
            const doc = textToBlob(text);
            processFiles([doc]);
            setSubjectDescription(`[Detailed description attached as ${doc.name}]`);
            addNotification('Long description converted to a reference document.');
        }
    };

    const handleSubjectPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        let imageFile: File | null = null;
        for (const item of e.clipboardData.items) {
            if (item.type.startsWith("image/")) {
                imageFile = item.getAsFile();
                break;
            }
        }
        
        if (imageFile) {
            e.preventDefault();
            processFiles([imageFile]);
            addNotification('Pasted image added to references.');
        }
    };

    const handleConfirmDeleteAssets = (assetIds: string[]) => {
        updateActiveProject(p => ({
            ...p,
            generatedAssets: p.generatedAssets.filter(asset => !assetIds.includes(asset.id)),
            referenceAssets: p.referenceAssets.filter(asset => !assetIds.includes(asset.id))
        }));
        setSelectedImageIds(prev => { const newSet = new Set(prev); assetIds.forEach(id => newSet.delete(id)); return newSet; });
        addNotification(`${assetIds.length} item(s) deleted.`, 'info');
        setLightboxConfig({ isOpen: false, asset: null, source: 'generated' });
        setDeleteAssetsTarget(null);
    };

    const handleDeleteGeneratedAssets = (assetIds: string[]) => {
        if (confirmOnDelete) {
            setDeleteAssetsTarget(assetIds);
        } else {
            handleConfirmDeleteAssets(assetIds);
        }
    };

    const handleDeleteReferenceAsset = (assetId: string) => {
        if(confirmOnDelete && !confirm('Are you sure you want to delete this reference asset?')){
            return;
        }
        updateActiveProject(p => ({...p, referenceAssets: p.referenceAssets.filter(asset => asset.id !== assetId)}));
        addNotification("Reference asset deleted.", 'info');
        setLightboxConfig({ isOpen: false, asset: null, source: 'generated' });
    };

    const handleDeleteFromViewer = (assetId: string) => {
        if (lightboxConfig.source === 'generated') {
            handleDeleteGeneratedAssets([assetId]);
        } else {
            handleDeleteReferenceAsset(assetId);
        }
    }
    
    const handlePromptDelete = (promptId: string) => {
        if (confirmOnDelete && !confirm(`Are you sure you want to delete this custom prompt?`)) return;
        updateActiveProject(p => ({...p, customPrompts: p.customPrompts.filter(prompt => prompt.id !== promptId)}));
        addNotification("Custom prompt deleted.", 'info');
    };
    
    const handleSaveEditedPrompt = (promptToSave: CustomPrompt) => {
        updateActiveProject(p => {
            const existingIndex = p.customPrompts.findIndex(cp => cp.id === promptToSave.id);
            if (existingIndex > -1) {
                const originalPrompt = p.customPrompts[existingIndex];
                const newPrompts = [...p.customPrompts];

                let newVersion = originalPrompt.version;
                let historyToUpdate = originalPrompt.history || [];

                const hasTextChanged = originalPrompt.text !== promptToSave.text;

                if (hasTextChanged) {
                    const historyEntry: CustomPromptHistory = {
                        version: originalPrompt.version,
                        text: originalPrompt.text,
                        tags: originalPrompt.tags,
                        referenceAssetIds: originalPrompt.referenceAssetIds,
                        aspectRatio: originalPrompt.aspectRatio,
                        createdAt: originalPrompt.createdAt,
                    };
                    historyToUpdate = [historyEntry, ...historyToUpdate];

                    const versionParts = newVersion.split('.').map(Number);
                    versionParts[versionParts.length - 1] = (versionParts[versionParts.length - 1] || 0) + 1;
                    newVersion = versionParts.join('.');
                }
                
                newPrompts[existingIndex] = {
                    ...promptToSave,
                    id: originalPrompt.id,
                    version: newVersion,
                    history: historyToUpdate,
                    createdAt: hasTextChanged ? Date.now() : originalPrompt.createdAt
                };
                return {...p, customPrompts: newPrompts };

            } else { // It's a default prompt, create a new custom one
                const newPromptWithId: CustomPrompt = { ...promptToSave, id: crypto.randomUUID(), version: '1.0', folderId: activePromptFolderId, createdAt: Date.now(), history: [] };
                addNotification("Default prompt copied and edited as a new custom prompt.", "info");
                return {...p, customPrompts: [newPromptWithId, ...p.customPrompts]};
            }
        });
        setEditingPrompt(null);
    };

    const handleAssetUpdate = (updatedAsset: GeneratedAsset) => {
        updateActiveProject(p => ({...p, generatedAssets: p.generatedAssets.map(asset => asset.id === updatedAsset.id ? updatedAsset : asset)}));
    };

    const handleReferenceAssetUpdate = (updatedAsset: ReferenceAsset) => {
        updateActiveProject(p => ({...p, referenceAssets: p.referenceAssets.map(asset => asset.id === updatedAsset.id ? updatedAsset : asset)}));
    };

    const handleUpdateFromViewer = (asset: GeneratedAsset | ReferenceAsset) => {
        if ('imageUrl' in asset) {
            handleAssetUpdate(asset);
        } else {
            handleReferenceAssetUpdate(asset);
        }
    };
    
    const handleSaveEditedImage = async (originalAsset: GeneratedAsset | ReferenceImage, newDataUrl: string, name?: string) => {
        const resolution = await getResolution(newDataUrl);
        const newName = name || originalAsset.name;
        const newAsset: GeneratedAsset = {
            ...originalAsset,
            id: crypto.randomUUID(),
            imageUrl: newDataUrl,
            name: newName,
            createdAt: Date.now(),
            editedFromId: originalAsset.id,
            resolution,
            // Fields specific to GeneratedAsset, may not exist on ReferenceImage
            prompt: 'prompt' in originalAsset ? originalAsset.prompt : `Edited from ${originalAsset.name}`,
            promptId: 'promptId' in originalAsset ? originalAsset.promptId : '',
            subject: 'subject' in originalAsset ? originalAsset.subject : '',
            tags: [],
            referenceAssetIds: [],
            aspectRatio: 'aspectRatio' in originalAsset && originalAsset.aspectRatio ? originalAsset.aspectRatio : defaultAspectRatio,
            folderId: activeAssetFolderId,
        };
        updateActiveProject(p => ({...p, generatedAssets: [...p.generatedAssets, newAsset]}));
        setEditorConfig({ isOpen: true, asset: newAsset }); // Keep modal open with new asset
        addNotification(`Saved new edited version of the image.`);
    };

    const handleSaveBatchEdits = async (edits: { originalAsset: GeneratedAsset, newDataUrl: string, name?: string }[]) => {
        if (!edits || edits.length === 0) return;

        addNotification(`Saving ${edits.length} edited image(s)...`);

        const newAssets: GeneratedAsset[] = await Promise.all(edits.map(async (edit) => {
            const resolution = await getResolution(edit.newDataUrl);
            const newAsset: GeneratedAsset = {
                ...edit.originalAsset,
                id: crypto.randomUUID(),
                imageUrl: edit.newDataUrl,
                name: edit.name || `${edit.originalAsset.name}_batch_edited`,
                createdAt: Date.now(),
                editedFromId: edit.originalAsset.id,
                resolution,
                tags: [...(edit.originalAsset.tags || []), 'batch-edited'],
                referenceAssetIds: [], // Batch edits don't carry over references by default
                folderId: activeAssetFolderId, // Ensure it's saved to the current folder
            };
            return newAsset;
        }));

        updateActiveProject(p => ({ ...p, generatedAssets: [...p.generatedAssets, ...newAssets] }));
        addNotification(`Successfully saved ${newAssets.length} new images.`, 'info');
        setSelectedImageIds(new Set()); // Deselect after batch editing
        setIsBatchEditorOpen(false);
    };


    const handleLogout = async () => {
        try {
            await logout();
            setUser(null, true);
            setSubjectDescription("a high-end, solar-powered watch with a leather strap");
            setHasUserEditedDescription(false);
            setIsBatchMode(false); setSelectedPrompts([]); setLoadingStates({});
            setCollapsedSections({ "Prompting Tips": true });
            addNotification("You have been logged out.", "info");
        } catch (error: any) {
            addNotification(`Logout failed: ${error.message}`, "error");
        }
    };

    // Project CRUD
    const handleRenameSave = (newName: string, projectId?: string) => {
        if (!renameTarget) return;
        const { type, id, parentId, folderType } = renameTarget;
        switch (type) {
            case 'project':
                const isCreating = !id;
                if (isCreating) {
                    const newProject: Project = {
                        id: crypto.randomUUID(), name: newName, createdAt: Date.now(),
                        customPrompts: [], generatedAssets: [], referenceAssets: [],
                        folders: [],
                    };
                    updateUser(u => ({
                        ...u, projects: [...u.projects, newProject], activeProjectId: newProject.id, activePromptFolderId: null, activeAssetFolderId: null
                    }));
                    addNotification(`Project "${newName}" created.`);
                } else {
                    updateActiveProject(p => ({ ...p, name: newName }));
                    addNotification(`Project renamed to "${newName}".`);
                }
                break;
            case 'folder':
                const isCreatingFolder = !id;
                if(isCreatingFolder) {
                    const newFolder: Folder = { id: crypto.randomUUID(), name: newName, parentId: parentId || null, createdAt: Date.now(), type: folderType!, projectId: projectId };
                    updateActiveProject(p => ({...p, folders: [...p.folders, newFolder]}));
                    
                    // Automatically switch to the newly created folder
                    if (folderType === 'prompt') {
                        updateUser(u => ({ ...u, activePromptFolderId: newFolder.id }));
                    } else if (folderType === 'asset') {
                        updateUser(u => ({ ...u, activeAssetFolderId: newFolder.id }));
                    }
                    addNotification(`Folder "${newName}" created.`);
                } else {
                    if (id) {
                        // Check if moving to a different project
                        if (projectId && user) {
                            const currentFolder = activeProject?.folders.find(f => f.id === id);
                            const targetProject = user.projects.find(p => p.id === projectId);
                            const currentProject = activeProject;
                            
                            if (currentFolder && targetProject && currentProject && currentProject.id !== projectId) {
                                // Move folder to different project
                                updateUser(u => ({
                                    ...u,
                                    projects: u.projects.map(p => {
                                        if (p.id === currentProject.id) {
                                            // Remove folder from current project
                                            return {
                                                ...p,
                                                folders: p.folders.filter(f => f.id !== id),
                                                // Also update assets/prompts in this folder to have null folderId
                                                generatedAssets: p.generatedAssets.map(a => a.folderId === id ? {...a, folderId: null} : a),
                                                customPrompts: p.customPrompts.map(a => a.folderId === id ? {...a, folderId: null} : a),
                                                referenceAssets: p.referenceAssets.map(a => a.folderId === id ? {...a, folderId: null} : a),
                                            };
                                        } else if (p.id === projectId) {
                                            // Add folder to target project
                                            return {
                                                ...p,
                                                folders: [...p.folders, { ...currentFolder, name: newName, projectId }]
                                            };
                                        }
                                        return p;
                                    })
                                }));
                                addNotification(`Folder "${newName}" moved to "${targetProject.name}".`);
                            } else {
                                // Just rename within same project
                                updateActiveProject(p => ({...p, folders: p.folders.map(f => f.id === id ? {...f, name: newName, projectId} : f)}));
                                addNotification(`Folder renamed to "${newName}".`);
                            }
                        } else {
                            // Just rename
                            updateActiveProject(p => ({...p, folders: p.folders.map(f => f.id === id ? {...f, name: newName} : f)}));
                            addNotification(`Folder renamed to "${newName}".`);
                        }
                    }
                }
                break;
        }
        setRenameTarget(null);
    };

    const handleDeleteConfirm = () => {
        if (!deleteTarget || !user) return;
        const { type, id, name, folderType } = deleteTarget;

        if (type === 'project') {
            if (user.projects.length <= 1) {
                addNotification("Cannot delete the last project.", 'error'); return;
            }
            const newProjects = user.projects.filter(p => p.id !== user.activeProjectId);
            const newActiveProject = newProjects[0];
            const newActiveProjectId = newActiveProject?.id || null;
            const newActivePromptFolderId = newActiveProject?.folders.find(f => f.type === 'prompt')?.id || null;
            const newActiveAssetFolderId = newActiveProject?.folders.find(f => f.type === 'asset')?.id || null;
            updateUser(u => ({ ...u, projects: newProjects, activeProjectId: newActiveProjectId, activePromptFolderId: newActivePromptFolderId, activeAssetFolderId: newActiveAssetFolderId }));
            addNotification(`Project "${name}" deleted.`, 'info');
        }

        if (type === 'folder' && id) {
            updateActiveProject(p => {
                const foldersToDelete = new Set([id]);
                // TODO: handle child folders
                return {
                    ...p,
                    folders: p.folders.filter(f => !foldersToDelete.has(f.id)),
                    generatedAssets: p.generatedAssets.map(a => foldersToDelete.has(a.folderId!) ? {...a, folderId: null} : a),
                    customPrompts: p.customPrompts.map(a => foldersToDelete.has(a.folderId!) ? {...a, folderId: null} : a),
                    referenceAssets: p.referenceAssets.map(a => foldersToDelete.has(a.folderId!) ? {...a, folderId: null} : a),
                }
            });
            if(folderType === 'prompt' && activePromptFolderId === id) updateUser(u => ({...u, activePromptFolderId: null}));
            if(folderType === 'asset' && activeAssetFolderId === id) updateUser(u => ({...u, activeAssetFolderId: null}));
        }
        setDeleteTarget(null);
    };

    const handleSwitchProject = (projectId: string) => {
        updateUser(u => {
            const newProject = u.projects.find(p => p.id === projectId);
            return { ...u, activeProjectId: projectId, activePromptFolderId: newProject?.folders.find(f=>f.type==='prompt')?.id || null, activeAssetFolderId: newProject?.folders.find(f=>f.type==='asset')?.id || null };
        });
    };
    
    const handleMoveFolderToProject = (folderId: string, targetProjectId: string) => {
        if (!user || !activeProject) return;
        
        const currentFolder = activeProject.folders.find(f => f.id === folderId);
        const targetProject = user.projects.find(p => p.id === targetProjectId);
        
        if (!currentFolder || !targetProject || activeProject.id === targetProjectId) return;
        
        updateUser(u => ({
            ...u,
            projects: u.projects.map(p => {
                if (p.id === activeProject.id) {
                    // Remove folder from current project
                    return {
                        ...p,
                        folders: p.folders.filter(f => f.id !== folderId),
                        // Update assets/prompts in this folder to have null folderId
                        generatedAssets: p.generatedAssets.map(a => a.folderId === folderId ? {...a, folderId: null} : a),
                        customPrompts: p.customPrompts.map(a => a.folderId === folderId ? {...a, folderId: null} : a),
                        referenceAssets: p.referenceAssets.map(a => a.folderId === folderId ? {...a, folderId: null} : a),
                    };
                } else if (p.id === targetProjectId) {
                    // Add folder to target project
                    return {
                        ...p,
                        folders: [...p.folders, { ...currentFolder, projectId: targetProjectId }]
                    };
                }
                return p;
            })
        }));
        
        addNotification(`Folder "${currentFolder.name}" moved to "${targetProject.name}".`);
        
        // Clear active folder if it was the one moved
        if (currentFolder.type === 'prompt' && activePromptFolderId === folderId) {
            updateUser(u => ({...u, activePromptFolderId: null}));
        } else if (currentFolder.type === 'asset' && activeAssetFolderId === folderId) {
            updateUser(u => ({...u, activeAssetFolderId: null}));
        }
    };

    // Folder CRUD
    const handleFolderAction = (action: 'create' | 'rename' | 'delete', folderId: string | null, type: 'prompt' | 'asset') => {
        switch(action) {
            case 'create':
                setRenameTarget({ type: 'folder', id: null, name: 'New Folder', folderType: type, parentId: null });
                break;
            case 'rename': {
                if(!folderId) return;
                const folder = activeProject?.folders.find(f => f.id === folderId);
                if(folder) setRenameTarget({ type: 'folder', id: folderId, name: folder.name, folderType: type });
                break;
            }
            case 'delete': {
                if(!folderId) return;
                const folder = activeProject?.folders.find(f => f.id === folderId);
                if(folder) setDeleteTarget({ type: 'folder', id: folderId, name: folder.name, folderType: type });
                break;
            }
        }
    }

    const handleMoveAssetsToFolder = (assetIds: string[], folderId: string | null) => {
        updateActiveProject(p => ({
            ...p,
            generatedAssets: p.generatedAssets.map(a => assetIds.includes(a.id) ? {...a, folderId} : a),
            referenceAssets: p.referenceAssets.map(a => assetIds.includes(a.id) ? {...a, folderId} : a)
        }));
        addNotification(`${assetIds.length} asset(s) moved.`, "info");
    }

    const handleSetPromptReferences = (promptId: string, refIds: string[]) => {
        if (promptId === '__BATCH_MODE__') {
            const promptIdsToUpdate = selectedPrompts;
            addNotification(`Adding references to ${promptIdsToUpdate.length} selected prompts...`);
            updateActiveProject(p => {
                const newCustomPrompts = [...p.customPrompts];
                let promptsCreated = 0;

                promptIdsToUpdate.forEach(idToUpdate => {
                    const existingIndex = newCustomPrompts.findIndex(cp => cp.id === idToUpdate);
                    if (existingIndex > -1) {
                         newCustomPrompts[existingIndex] = {...newCustomPrompts[existingIndex], referenceAssetIds: [...new Set([...newCustomPrompts[existingIndex].referenceAssetIds, ...refIds])]};
                    } else {
                        const defaultPrompt = allPrompts.find(pr => pr.id === idToUpdate);
                        if (defaultPrompt) {
                            const newCustomPrompt: CustomPrompt = { ...defaultPrompt, id: crypto.randomUUID(), folderId: activePromptFolderId, referenceAssetIds: refIds, createdAt: Date.now() };
                            newCustomPrompts.unshift(newCustomPrompt);
                            promptsCreated++;
                        }
                    }
                });
                if (promptsCreated > 0) addNotification(`Created ${promptsCreated} new custom prompts from defaults.`);
                return {...p, customPrompts: newCustomPrompts};
            });
            return;
        }

        updateActiveProject(p => {
            const promptIndex = p.customPrompts.findIndex(cp => cp.id === promptId);
            if (promptIndex > -1) {
                const newPrompts = [...p.customPrompts];
                newPrompts[promptIndex] = {...newPrompts[promptIndex], referenceAssetIds: refIds};
                return {...p, customPrompts: newPrompts};
            }
            // If it's a default prompt, we need to create a custom copy
            const defaultPrompt = allPrompts.find(pr => pr.id === promptId);
            if (defaultPrompt) {
                const newCustomPrompt: CustomPrompt = { ...defaultPrompt, id: crypto.randomUUID(), folderId: activePromptFolderId, referenceAssetIds: refIds, createdAt: Date.now() };
                addNotification("Reference added to a new custom prompt copy.", "info");
                // Replace the default ID with the new custom ID in selection
                setSelectedPrompts(s => s.map(id => id === promptId ? newCustomPrompt.id : id));
                return {...p, customPrompts: [newCustomPrompt, ...p.customPrompts]};
            }
            return p;
        })
    }
    
    const handleExportProject = async () => {
        if (!activeProject) return;
        addNotification(`Exporting project "${activeProject.name}"...`, 'info');

        try {
            const JSZip = window.JSZip;
            if (!JSZip) {
                throw new Error("JSZip library not found. Export failed.");
            }
            const zip = new JSZip();

            const projectDataForJson = JSON.parse(JSON.stringify(activeProject));
            const assetsFolder = zip.folder("assets");
            if (!assetsFolder) throw new Error("Could not create assets folder in zip.");

            const genAssetMap = new Map(projectDataForJson.generatedAssets.map((a: any) => [a.id, a]));
            const refAssetMap = new Map(projectDataForJson.referenceAssets.map((a: any) => [a.id, a]));
            
            const processAsset = async (asset: any) => {
                if ('type' in asset && asset.type === 'document') {
                    try {
                        const blob = new Blob([asset.content], { type: asset.mimeType });
                        const extension = asset.mimeType.split('/')[1] || 'txt';
                        const fileName = `${sanitizeFilename(asset.name)}_${asset.id}.${extension}`;
                        const filePath = `assets/${fileName}`;
                        
                        assetsFolder.file(fileName, blob);

                        const jsonAsset = refAssetMap.get(asset.id);
                        if (jsonAsset) {
                            const mutableAsset = jsonAsset as any;
                            mutableAsset.filePath = filePath;
                            delete mutableAsset.content;
                        }
                    } catch (e) {
                        console.error(`Could not zip document asset: ${asset.name}`, e);
                        addNotification(`Skipping asset due to error: ${asset.name}`, 'error');
                    }
                    return;
                }

                const url = 'imageUrl' in asset ? asset.imageUrl : ('previewUrl' in asset ? asset.previewUrl : undefined);
                if (!url) return;
                
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const extension = blob.type.split('/')[1]?.split('+')[0] || 'png';
                    const fileName = `${sanitizeFilename(asset.name)}_${asset.id}.${extension}`;
                    const filePath = `assets/${fileName}`;
                    
                    assetsFolder.file(fileName, blob);

                    const jsonAsset = ('imageUrl' in asset) 
                        ? genAssetMap.get(asset.id)
                        : refAssetMap.get(asset.id);

                    if (jsonAsset) {
                        const mutableAsset = jsonAsset as any;
                        mutableAsset.filePath = filePath;
                        delete mutableAsset.imageUrl;
                        delete mutableAsset.previewUrl;
                        delete mutableAsset.base64;
                    }
                } catch (e) {
                    console.error(`Could not fetch and zip asset: ${asset.name}`, e);
                    addNotification(`Skipping asset due to error: ${asset.name}`, 'error');
                }
            };
            
            await Promise.all([
                ...activeProject.generatedAssets.map(processAsset),
                ...activeProject.referenceAssets.map(processAsset)
            ]);
            
            zip.file("project.json", JSON.stringify(projectDataForJson, null, 2));

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `${sanitizeFilename(activeProject.name)}-${timestamp}.aistudio.zip`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            addNotification(`Project "${activeProject.name}" exported successfully.`, 'info');
        } catch (error: any) {
            console.error("Export failed:", error);
            addNotification(`Project export failed: ${error.message}`, 'error');
        }
    };

    const handleExportFolder = async (folderId: string | null, type: 'prompt' | 'asset') => {
        if (!activeProject) return;
        const folder = folderId ? activeProject.folders.find(f => f.id === folderId) : null;
        const folderName = folder ? folder.name : (type === 'prompt' ? 'root-prompts' : 'root-assets');
        addNotification(`Exporting folder "${folderName}"...`, 'info');

        try {
            const JSZip = window.JSZip;
            if (!JSZip) throw new Error("JSZip library not found.");

            const zip = new JSZip();
            const assetsFolder = zip.folder("assets");
            if (!assetsFolder) throw new Error("Could not create assets folder.");
            
            const processAsset = async (asset: GeneratedAsset | ReferenceAsset) => {
                if ('type' in asset && asset.type === 'document') {
                    try {
                        const blob = new Blob([asset.content], { type: asset.mimeType });
                        const extension = asset.mimeType.split('/')[1] || 'txt';
                        assetsFolder.file(`${sanitizeFilename(asset.name)}_${asset.id}.${extension}`, blob);
                    } catch (e) {
                         addNotification(`Skipping asset due to error: ${asset.name}`, 'error');
                    }
                    return;
                }

                const url = 'imageUrl' in asset ? asset.imageUrl : ('previewUrl' in asset ? asset.previewUrl : undefined);
                if (!url) return;
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const extension = blob.type.split('/')[1]?.split('+')[0] || 'png';
                    assetsFolder.file(`${sanitizeFilename(asset.name)}_${asset.id}.${extension}`, blob);
                } catch (e) {
                     addNotification(`Skipping asset due to error: ${asset.name}`, 'error');
                }
            };
            
            if (type === 'prompt') {
                const promptsToExport = activeProject.customPrompts.filter(p => p.folderId === folderId);
                const promptIdsInFolder = new Set(promptsToExport.map(p => p.id));
                const generatedAssetsForPrompts = activeProject.generatedAssets.filter(a => promptIdsInFolder.has(a.promptId));
                const referencedAssetIds = new Set(promptsToExport.flatMap(p => p.referenceAssetIds));
                const referenceAssetsForPrompts = activeProject.referenceAssets.filter(a => referencedAssetIds.has(a.id));
                const assetsToExport = [...generatedAssetsForPrompts, ...referenceAssetsForPrompts];
                
                zip.file("prompts.json", JSON.stringify(promptsToExport, null, 2));
                await Promise.all(assetsToExport.map(asset => processAsset(asset)));

            } else { // type === 'asset'
                const assetsToExport = [
                    ...activeProject.generatedAssets.filter(a => a.folderId === folderId),
                    ...activeProject.referenceAssets.filter(a => a.folderId === folderId)
                ];
                await Promise.all(assetsToExport.map(asset => processAsset(asset)));
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${sanitizeFilename(folderName)}_export.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            addNotification(`Folder "${folderName}" exported successfully.`, 'info');

        } catch (error: any) {
             addNotification(`Folder export failed: ${error.message}`, 'error');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        addNotification(`Importing "${file.name}"...`, 'info');
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const zipData = e.target?.result;
                if (!zipData) throw new Error("Failed to read file.");

                const JSZip = window.JSZip;
                if (!JSZip) throw new Error("JSZip library is not available.");

                const zip = await JSZip.loadAsync(zipData as ArrayBuffer);
                const projectFile = zip.file("project.json");
                const promptFile = zip.file("prompts.json");

                if (projectFile) { // Project Import
                    const projectJsonText = await projectFile.async("string");
                    const importedProject = JSON.parse(projectJsonText) as Project;

                    if (!importedProject.name || !Array.isArray(importedProject.folders)) {
                        throw new Error("Invalid project file format.");
                    }

                    const reconstructAsset = async (asset: any) => {
                        if (asset.filePath) {
                            const assetFile = zip.file(asset.filePath);
                            if (assetFile) {
                                const blob = await assetFile.async("blob");
                                const base64 = await blobToBase64(blob);
                                const dataUrl = `data:${blob.type};base64,${base64}`;
                                
                                if ('prompt' in asset) {
                                    asset.imageUrl = dataUrl;
                                } else {
                                    asset.previewUrl = dataUrl;
                                    asset.base64 = base64;
                                    asset.mimeType = blob.type;
                                }
                                delete asset.filePath;
                            } else {
                                addNotification(`Asset file not found in zip: ${asset.filePath}`, 'error');
                            }
                        }
                        return asset;
                    };

                    importedProject.generatedAssets = await Promise.all((importedProject.generatedAssets || []).map(reconstructAsset));
                    importedProject.referenceAssets = await Promise.all((importedProject.referenceAssets || []).map(reconstructAsset));
                    
                    importedProject.id = crypto.randomUUID();
                    importedProject.createdAt = Date.now();

                    updateUser(u => ({
                        ...u,
                        projects: [...u.projects, importedProject],
                        activeProjectId: importedProject.id,
                        activePromptFolderId: importedProject.folders.find(f => f.type === 'prompt')?.id || null,
                        activeAssetFolderId: importedProject.folders.find(f => f.type === 'asset')?.id || null,
                    }));

                    addNotification(`Project "${importedProject.name}" imported successfully!`, 'info');

                } else if (promptFile) { // Prompt Folder Import
                    const promptsJsonText = await promptFile.async("string");
                    const importedPrompts = JSON.parse(promptsJsonText) as CustomPrompt[];

                    const newPrompts = importedPrompts.map(p => ({
                        ...p,
                        id: crypto.randomUUID(), // New ID to avoid collisions
                        folderId: activePromptFolderId // Add to current folder
                    }));
                    
                    updateActiveProject(p => ({
                        ...p,
                        customPrompts: [...p.customPrompts, ...newPrompts]
                    }));
                    addNotification(`Imported ${newPrompts.length} prompts. Note: Associated assets are not imported with this method.`, 'info');

                } else {
                    throw new Error("Invalid archive. Could not find 'project.json' or 'prompts.json'.");
                }

            } catch (error: any) {
                console.error("Import failed:", error);
                addNotification(`Import failed: ${error.message}`, 'error');
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    if (!currentUser || !user) {
        return <AuthScreen />;
    }

    const ControlsSection: React.FC<{title: string, children: React.ReactNode, defaultOpen?: boolean}> = ({ title, children, defaultOpen=true }) => (
        <details className="border-t border-slate-700 pt-6 group/controls" open={defaultOpen}>
            <summary className="list-none cursor-pointer font-medium text-slate-300 mb-2 flex justify-between items-center">
                {title}
                <Icon path={ICONS.CHEVRON_UP} className="w-5 h-5 text-slate-500 transition-transform group-open/controls:rotate-180" />
            </summary>
            <div className="pt-2">
                {children}
            </div>
        </details>
    );

    let promptCardIndex = 0;

    return (
        <div className="bg-slate-900 text-slate-200 min-h-screen font-sans bg-aurora flex flex-col">
             <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".aistudio.zip,.zip" style={{ display: 'none' }} />
            <style>{`
                @keyframes aurora-glow { 
                    0% { background-position: 0% 50%; } 
                    50% { background-position: 100% 50%; } 
                    100% { background-position: 0% 50%; } 
                } 
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes spin-slow {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(-360deg); }
                }
                .bg-aurora { 
                    background-size: 400% 400%; 
                    animation: aurora-glow 20s ease infinite; 
                    background-color: #0f172a; 
                    background-image: radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 0.1) 0px, transparent 50%), radial-gradient(at 97% 21%, hsla(125, 98%, 72%, 0.1) 0px, transparent 50%), radial-gradient(at 52% 99%, hsla(355, 98%, 61%, 0.1) 0px, transparent 50%), radial-gradient(at 10% 29%, hsla(256, 96%, 67%, 0.1) 0px, transparent 50%), radial-gradient(at 97% 96%, hsla(38, 60%, 74%, 0.1) 0px, transparent 50%), radial-gradient(at 33% 50%, hsla(222, 67%, 73%, 0.1) 0px, transparent 50%), radial-gradient(at 79% 53%, hsla(343, 68%, 79%, 0.1) 0px, transparent 50%); 
                } 
                .custom-scroll { 
                    scrollbar-width: thin; 
                    scrollbar-color: #475569 transparent; 
                } 
                .custom-scroll::-webkit-scrollbar { 
                    width: 8px; 
                } 
                .custom-scroll::-webkit-scrollbar-track { 
                    background: transparent; 
                } 
                .custom-scroll::-webkit-scrollbar-thumb { 
                    background: #475569; 
                    border-radius: 6px; 
                } 
                .custom-scroll::-webkit-scrollbar-thumb:hover { 
                    background: #64748b; 
                } 
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
                summary::marker { 
                    content: ""; 
                }
            `}</style>
            
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 flex-shrink-0">
                <div className="container mx-auto px-4 sm:px-6 md:px-8 py-3">
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
                            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">AI Image Studio</h1>
                            <div className="flex items-center gap-2 p-1 bg-slate-800 rounded-full">
                                <Tooltip text={`Undo (${navigator.platform.toUpperCase().includes('MAC') ? '⌘' : 'Ctrl'}+Z)`}><button onClick={undoUser} disabled={!canUndo} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"><Icon path={ICONS.UNDO} /></button></Tooltip>
                                <Tooltip text={`Redo (${navigator.platform.toUpperCase().includes('MAC') ? '⌘' : 'Ctrl'}+Y)`}><button onClick={redoUser} disabled={!canRedo} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"><Icon path={ICONS.REDO} /></button></Tooltip>
                            </div>
                        </div>
                            <div className="flex items-center gap-3 flex-wrap justify-center xl:justify-end w-full xl:w-auto">
                            {isBatchMode && (anyLoading ? 
                                <button onClick={handleStopAll} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-md transition text-base">
                                    <Icon path={ICONS.STOP}/>
                                    <span className="hidden md:inline">Stop All</span>
                                </button> :
                                <>
                                <button onClick={() => setIsReferenceSelectorOpen('__BATCH_MODE__')} disabled={selectedPrompts.length === 0} className="flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition text-base disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed">
                                    <Icon path={ICONS.ADD_REFERENCE}/>
                                    <span className="hidden md:inline">Refs</span>
                                </button>
                                <button onClick={() => handleBatchGenerate(selectedPrompts)} disabled={selectedPrompts.length === 0} className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-2 px-4 rounded-md transition text-base disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed">
                                    <Icon path={ICONS.SPARKLES}/>
                                    <span className="hidden md:inline">Generate</span> ({selectedPrompts.length})
                                </button>
                                </>
                            )}
                            <button onClick={() => setIsGalleryOpen(true)} className="flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition">
                                <Icon path={ICONS.GRID}/>
                                <span className="hidden md:inline">Gallery</span> 
                                <span>({activeProject?.generatedAssets.length || 0})</span>
                            </button>
                            <button onClick={() => setIsCoffeeModalOpen(true)} className="flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 text-black font-bold p-2 rounded-md transition" title="Buy me a coffee">
                                <Icon path={ICONS.COFFEE} className="w-5 h-5" />
                            </button>
                            <span className="text-slate-400 hidden xl:block">|</span>
                            <div className="text-sm text-slate-300 hidden xl:block">Welcome, <span className="font-bold text-white">{user.username}</span></div>
                            <Tooltip text="Settings"><button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-600/60 rounded-full"><Icon path={ICONS.SETTINGS} /></button></Tooltip>
                            <Tooltip text="Logout"><button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-600/60 rounded-full"><Icon path={ICONS.LOGOUT} /></button></Tooltip>
                        </div>
                    </div>
                </div>
            </header>
            
            <div className="container mx-auto p-4 sm:p-6 md:p-8 flex-grow min-h-0 lg:overflow-y-hidden">
                <NotificationToast notifications={notifications} onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
                
                <div className="flex flex-col lg:flex-row gap-8 lg:h-full overflow-hidden">
                    <aside className="w-full lg:w-1/3 xl:w-1/4 bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
                        <div className="lg:overflow-y-auto overflow-x-hidden custom-scroll">
                            <details className="p-6" open={!isControlsCollapsed} onToggle={(e) => setIsControlsCollapsed(!e.currentTarget.open)}>
                                <summary className="list-none cursor-pointer flex justify-between items-center group">
                                    <h2 className="text-2xl font-semibold text-white">Studio Controls</h2>
                                    <Icon path={ICONS.CHEVRON_UP} className={`w-8 h-8 text-slate-400 transition-transform ${!isControlsCollapsed ? 'rotate-180' : ''}`} />
                                </summary>
                                
                                {isControlsCollapsed && 
                                    <div className="mt-4 space-y-2 text-sm border-t border-slate-700 pt-4">
                                        <p className="flex items-center gap-2 text-slate-300 truncate"><Icon path={ICONS.PROJECT} className="w-4 h-4 text-cyan-400 flex-shrink-0" /> <span className="truncate">{activeProject?.name}</span></p>
                                    </div>
                                }
                                <div className="space-y-6 mt-4 border-t border-slate-700 pt-4">
                                    <ControlsSection title="Project Management" defaultOpen={true}>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Current Project</label>
                                        <select value={user.activeProjectId || ''} onChange={e => handleSwitchProject(e.target.value)} className="w-full bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2 mb-2">
                                            {user.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setRenameTarget({type: 'project', id: null, name: 'My New Project'})} className="text-sm bg-slate-700 hover:bg-slate-600 py-1.5 px-4 rounded-md">New</button>
                                                <button onClick={() => activeProject && setRenameTarget({ type: 'project', id: activeProject.id, name: activeProject.name })} className="text-sm bg-slate-700 hover:bg-slate-600 py-1.5 px-4 rounded-md">Rename</button>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Tooltip text="Import Project" position="top"><button onClick={handleImportClick} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-md"><Icon path={ICONS.DOWNLOAD} className="w-5 h-5" /></button></Tooltip>
                                                <Tooltip text="Export Project" position="top"><button onClick={handleExportProject} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-md"><Icon path={ICONS.UPLOAD} className="w-5 h-5" /></button></Tooltip>
                                                <Tooltip text="Delete Project" position="top"><button onClick={() => activeProject && setDeleteTarget({ type: 'project', id: activeProject.id, name: activeProject.name })} disabled={user.projects.length <= 1} className="p-2 text-red-400 hover:text-red-300 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"><Icon path={ICONS.TRASH} className="w-5 h-5" /></button></Tooltip>
                                            </div>
                                        </div>
                                    </ControlsSection>
                                    
                                        <ControlsSection title="Image Folder" defaultOpen={true}>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Current Asset Folder</label>
                                        <select value={activeAssetFolderId || ''} onChange={e => updateUser(u => ({...u, activeAssetFolderId: e.target.value || null}))} className="w-full bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2 mb-2">
                                            <option value="">Main</option>
                                            {assetFolders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleFolderAction('create', null, 'asset')} className="text-sm bg-slate-700 hover:bg-slate-600 py-1.5 px-4 rounded-md">New</button>
                                                <button onClick={() => activeAssetFolderId && handleFolderAction('rename', activeAssetFolderId, 'asset')} disabled={!activeAssetFolderId} className="text-sm bg-slate-700 hover:bg-slate-600 py-1.5 px-4 rounded-md disabled:opacity-50">Rename</button>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Tooltip text="Import Assets" position="top"><button onClick={() => document.getElementById('file-upload')?.click()} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-md"><Icon path={ICONS.DOWNLOAD} className="w-5 h-5" /></button></Tooltip>
                                                <Tooltip text="Export Folder" position="top"><button onClick={() => handleExportFolder(activeAssetFolderId, 'asset')} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-md"><Icon path={ICONS.UPLOAD} className="w-5 h-5" /></button></Tooltip>
                                                <Tooltip text="Delete Folder" position="top"><button onClick={() => activeAssetFolderId && handleFolderAction('delete', activeAssetFolderId, 'asset')} disabled={!activeAssetFolderId} className="p-2 text-red-400 hover:text-red-300 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50"><Icon path={ICONS.TRASH} className="w-5 h-5" /></button></Tooltip>
                                            </div>
                                        </div>
                                    </ControlsSection>

                                    <ControlsSection title="Subject & Assets" defaultOpen={true}>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Media Type</label>
                                        <select value={selectedMediaType} onChange={e => { setSelectedMediaType(e.target.value as MediaType); setHasUserEditedDescription(false); }} className="w-full bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2 mb-4">
                                            {Object.keys(MEDIA_CATEGORIES).map(type => <option key={type} value={type}>{type}</option>)}
                                        </select>

                                        <label className="block text-sm font-medium text-slate-400 mb-1">Subject Description</label>
                                        <textarea rows={3} className="w-full bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2 custom-scroll mb-4" value={subjectDescription} onChange={(e) => handleSubjectChange(e.target.value)} onPaste={handleSubjectPaste} placeholder="e.g., a high-end, solar-powered watch" />

                                        <label className="block text-sm font-medium text-slate-400 mb-1">Reference Assets (Drop files or click)</label>
                                        <div className={`relative border-2 border-dashed rounded-lg p-2 text-center transition-colors ${isDraggingOver ? 'border-blue-400 bg-blue-900/20' : 'border-slate-600 hover:border-slate-500'}`}
                                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }} onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={handleDrop}>
                                            <Icon path={ICONS.DOWNLOAD} className="mx-auto h-8 w-8 text-slate-400" />
                                            <p className="mt-1 text-xs text-slate-300"><label htmlFor="file-upload" className="font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer">Upload</label> or drop</p>
                                            <input id="file-upload" type="file" className="sr-only" onChange={handleFileSelect} multiple accept="image/*,text/plain,text/markdown,application/pdf"/>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">Assets are placed in the currently selected asset folder.</p>
                                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto custom-scroll pr-1">
                                            {visibleReferenceAssets.map(asset => 
                                                <AssetPreview 
                                                    key={asset.id} 
                                                    asset={asset}
                                                    onClick={(a) => {
                                                        // Fix: Only open image viewer for image assets, not documents.
                                                        if (a.type === 'image') {
                                                            setLightboxConfig({isOpen: true, asset: a, source: 'reference'})
                                                        } else {
                                                            addNotification("Document preview is not available in the lightbox.", "info");
                                                        }
                                                    }}
                                                    onDelete={handleDeleteReferenceAsset}
                                                    onRename={handleReferenceAssetUpdate}
                                                />
                                            )}
                                        </div>
                                    </ControlsSection>
                                </div>
                            </details>
                        </div>
                    </aside>
                    
                    <main className="w-full lg:flex-1 min-w-0 flex flex-col overflow-x-hidden">
                        <div className="lg:overflow-y-auto custom-scroll overflow-x-hidden">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-3xl lg:text-4xl font-bold text-white">Prompt Studio</h2>
                                    <p className="text-slate-400 mt-1">Craft the perfect prompts for your images.</p>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    <div className="relative">
                                        <Icon path={ICONS.SEARCH} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="search" 
                                            name="prompt-search"
                                            placeholder="Search prompts..." 
                                            value={searchTerm} 
                                            onChange={e => setSearchTerm(e.target.value)} 
                                            autoComplete="off"
                                            autoCorrect="off"
                                            autoCapitalize="off"
                                            spellCheck="false"
                                            className="bg-slate-800/60 border border-slate-700 rounded-full pl-10 pr-4 py-2 w-64 sm:w-96 text-lg focus:ring-cyan-500 focus:border-cyan-500" 
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-lg border border-slate-700 p-4 mb-6">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Current Prompt Folder</label>
                                <div className="flex gap-2">
                                    <select value={activePromptFolderId || ''} onChange={e => updateUser(u => ({...u, activePromptFolderId: e.target.value || null}))} className="flex-1 bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2">
                                        <option value="">All Prompts</option>
                                        {promptFolders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <button onClick={() => handleFolderAction('create', null, 'prompt')} className="text-sm bg-slate-700 hover:bg-slate-600 py-1.5 px-4 rounded-md">New</button>
                                    <button onClick={() => activePromptFolderId && handleFolderAction('rename', activePromptFolderId, 'prompt')} disabled={!activePromptFolderId} className="text-sm bg-slate-700 hover:bg-slate-600 py-1.5 px-4 rounded-md disabled:opacity-50">Rename</button>
                                    <Tooltip text="Import Prompts" position="top"><button onClick={handleImportClick} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-md"><Icon path={ICONS.DOWNLOAD} className="w-5 h-5" /></button></Tooltip>
                                    <Tooltip text="Export Folder" position="top"><button onClick={() => handleExportFolder(activePromptFolderId, 'prompt')} disabled={!activePromptFolderId} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50"><Icon path={ICONS.UPLOAD} className="w-5 h-5" /></button></Tooltip>
                                    <Tooltip text="Delete Folder" position="top"><button onClick={() => activePromptFolderId && handleFolderAction('delete', activePromptFolderId, 'prompt')} disabled={!activePromptFolderId} className="p-2 text-red-400 hover:text-red-300 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50"><Icon path={ICONS.TRASH} className="w-5 h-5" /></button></Tooltip>
                                </div>
                            </div>

                            <details open className="group/custom-prompts">
                                <summary className="list-none cursor-pointer flex flex-wrap justify-between items-center mb-4 gap-4">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-2xl font-bold text-slate-300">Your Custom Prompts</h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {isBatchMode && (
                                            <div className="flex items-center gap-2 self-center">
                                                <button onClick={(e) => { e.preventDefault(); handleGenerateSelectedCustomPrompts(); }} disabled={customPromptsSelectionCount === 0} className={`text-sm font-semibold py-1.5 px-3 rounded-md transition flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed`}>
                                                    <Icon path={ICONS.SPARKLES} className="w-4 h-4" />
                                                    <span className="hidden md:inline">Generate Selected</span> ({customPromptsSelectionCount})
                                                </button>
                                                <button onClick={(e) => { e.preventDefault(); handleSelectAllCustomPrompts(); }} className={`text-sm font-semibold py-1.5 px-3 rounded-md transition flex items-center gap-1.5 ${
                                                    customPromptsSelectionState === 'all' ? 'bg-orange-600 hover:bg-orange-500 text-white' :
                                                    customPromptsSelectionState === 'some' ? 'bg-slate-600 hover:bg-slate-500 text-orange-300 ring-1 ring-orange-500' :
                                                    'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                }`}>
                                                    <Icon path={customPromptsSelectionState === 'all' ? ICONS.CLOSE : ICONS.CHECK} className="w-4 h-4" />
                                                    <span className="hidden md:inline">{customPromptsSelectionState === 'all' ? 'Deselect All' : 'Select All'}</span>
                                                </button>
                                            </div>
                                        )}
                                        <Icon path={ICONS.CHEVRON_UP} className="w-7 h-7 text-slate-400 transition-transform group-open/custom-prompts:rotate-180" />
                                    </div>
                                </summary>
                                <div className="mb-6">
                                    <button onClick={() => setIsWizardOpen(true)} className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-4 rounded-md transition mb-4">
                                        <Icon path={ICONS.WAND} className="w-5 h-5"/>
                                        <span className="hidden sm:inline">AI Prompt Wizard</span>
                                        <span className="sm:hidden">AI Wizard</span>
                                    </button>
                                    <details className="group/add-manual bg-slate-800/50 rounded-md border border-slate-700">
                                        <summary className="list-none cursor-pointer flex items-center justify-between p-3 font-medium">
                                            <span>Add Prompts Manually</span>
                                            <Icon path={ICONS.CHEVRON_DOWN} className="w-5 h-5 transition-transform group-open/add-manual:rotate-180" />
                                        </summary>
                                        <div className="p-3 border-t border-slate-700 space-y-3">
                                            <textarea 
                                                value={newPrompt} 
                                                onChange={e => setNewPrompt(e.target.value)} 
                                                placeholder="Type or paste one or more prompts here, separated by new lines. Use [subject] as a placeholder." 
                                                rows={4} 
                                                className="w-full bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2 custom-scroll"
                                            ></textarea>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    id="add-mode-select"
                                                    className="flex-1 bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2 text-sm"
                                                >
                                                    <option value="add">Add to Current Folder</option>
                                                    <option value="replace">Replace Current Folder</option>
                                                    <option value="folder">Create New Folder</option>
                                                </select>
                                                <button 
                                                    onClick={() => { 
                                                        if(newPrompt.trim()) { 
                                                            const mode = (document.getElementById('add-mode-select') as HTMLSelectElement)?.value || 'add';
                                                            const prompts = newPrompt.split('\n').map(p => p.trim()).filter(p => p.length > 0);
                                                            if (prompts.length === 0) return;
                                                            
                                                            if (mode === 'folder') {
                                                                // Generate default folder name with incremented number
                                                                const existingFolders = activeProject?.folders.filter(f => f.type === 'prompt') || [];
                                                                const baseName = 'New Prompts';
                                                                let folderName = baseName;
                                                                let counter = 2;
                                                                while (existingFolders.some(f => f.name === folderName)) {
                                                                    folderName = `${baseName} (${counter})`;
                                                                    counter++;
                                                                }
                                                                
                                                                const userInput = prompt('Enter name for the new folder:', folderName);
                                                                const finalFolderName = userInput && userInput.trim() ? userInput.trim() : folderName;
                                                                
                                                                const newFolderId = crypto.randomUUID();
                                                                const newFolder: Folder = { 
                                                                    id: newFolderId, 
                                                                    name: finalFolderName, 
                                                                    parentId: null, 
                                                                    createdAt: Date.now(), 
                                                                    type: 'prompt' 
                                                                };
                                                                
                                                                // Update project and switch to new folder FIRST
                                                                updateActiveProject(p => ({...p, folders: [...p.folders, newFolder]}));
                                                                updateUser(u => ({ ...u, activePromptFolderId: newFolderId }));
                                                                
                                                                // Then add prompts to the new folder
                                                                setTimeout(() => {
                                                                    const newCustomPrompts: CustomPrompt[] = prompts.map(text => ({
                                                                        id: crypto.randomUUID(),
                                                                        name: text.length > 50 ? text.substring(0, 50) + '...' : text,
                                                                        version: '1.0',
                                                                        text,
                                                                        tags: [],
                                                                        folderId: newFolderId, // Use the new folder ID
                                                                        referenceAssetIds: [],
                                                                        createdAt: Date.now()
                                                                    }));
                                                                    
                                                                    updateActiveProject(p => ({
                                                                        ...p, 
                                                                        customPrompts: [...p.customPrompts, ...newCustomPrompts]
                                                                    }));
                                                                    
                                                                    addNotification(`Created folder "${finalFolderName}" with ${prompts.length} prompt(s).`);
                                                                }, 100);
                                                                
                                                                // Reset dropdown to "add"
                                                                const selectEl = document.getElementById('add-mode-select') as HTMLSelectElement;
                                                                if (selectEl) selectEl.value = 'add';
                                                            } else if (mode === 'replace') {
                                                                handleWizardGenerate(prompts, true);
                                                            } else {
                                                                handleWizardGenerate(prompts, false); 
                                                            }
                                                            setNewPrompt(''); 
                                                        }
                                                    }} 
                                                    disabled={promptsToAddCount === 0}
                                                    className="px-4 py-2 flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                >
                                                    <Icon path={ICONS.PLUS}/> <span className="hidden sm:inline">Add</span> {promptsToAddCount > 0 ? promptsToAddCount : ''} <span className="hidden sm:inline">Prompt{promptsToAddCount !== 1 ? 's' : ''}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0 overflow-x-hidden">
                                    {filteredCustomPrompts.map((p, i) => <PromptCard 
                                        key={p.id} 
                                        prompt={p}
                                        subjectDescription={subjectDescription}
                                        onGenerate={devMode ? handleSimulateImage : handleGenerateImage}
                                        onCopy={handleCopy}
                                        onSelectPrompt={(id, e) => handlePromptSelection(id, e, promptCardIndex++)}
                                        isPromptSelected={selectedPrompts.includes(p.id)}
                                        isLoading={loadingStates[p.id]?.isLoading}
                                        assets={activeProject?.generatedAssets.filter(a => a.promptId === p.id).sort((a,b) => b.createdAt - a.createdAt) || []}
                                        showPreviews={showAllPreviews}
                                        onPreviewClick={(asset) => setLightboxConfig({isOpen: true, asset: asset, source: 'generated'})}
                                        onStop={handleStopGeneration}
                                        onDelete={handlePromptDelete}
                                        onStartEdit={setEditingPrompt}
                                        onSaveEdit={handleSaveEditedPrompt}
                                        onCancelEdit={() => setEditingPrompt(null)}
                                        editingState={editingPrompt}
                                        onUpdateEditingPrompt={setEditingPrompt}
                                        isBatchMode={isBatchMode}
                                        onSetAspectRatio={(promptId, ratio) => updateActiveProject(proj => ({...proj, customPrompts: proj.customPrompts.map(prompt => prompt.id === promptId ? {...prompt, aspectRatio: ratio} : prompt)}))}
                                        onAddReferenceClick={(promptId) => setIsReferenceSelectorOpen(promptId)}
                                    />)}
                                </div>
                            </details>

                            <div className="my-10 border-t border-slate-700/50"></div>

                            {filteredPromptCategories.map(category => (
                                <details key={category.category} open={!collapsedSections[category.category]}>
                                    <summary className="list-none cursor-pointer" onClick={(e) => {
                                        e.preventDefault();
                                        setCollapsedSections(prev => ({...prev, [category.category]: !prev[category.category]}));
                                    }}>
                                        <SectionHeader 
                                            title={category.category}
                                            description={category.description}
                                            isCollapsed={!!collapsedSections[category.category]}
                                            onSelectAll={() => handleSelectAllInCategory(category.prompts)}
                                            categoryPromptIds={category.prompts}
                                            selectedPrompts={selectedPrompts}
                                            isBatchMode={isBatchMode}
                                            onGenerateSelected={() => handleBatchGenerate(selectedPrompts.filter(id => category.prompts.includes(id)))}
                                        />
                                    </summary>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 min-w-0 overflow-x-hidden">
                                        {category.prompts.map((p_text, i) => {
                                            const prompt = allPrompts.find(pr => pr.id === p_text)!;
                                            return <PromptCard
                                                key={p_text} 
                                                prompt={prompt}
                                                subjectDescription={subjectDescription}
                                                onGenerate={devMode ? handleSimulateImage : handleGenerateImage}
                                                onCopy={handleCopy}
                                                onSelectPrompt={(id, e) => handlePromptSelection(id, e, promptCardIndex++)}
                                                isPromptSelected={selectedPrompts.includes(p_text)}
                                                isLoading={loadingStates[p_text]?.isLoading}
                                                assets={activeProject?.generatedAssets.filter(a => a.promptId === p_text).sort((a,b) => b.createdAt - a.createdAt) || []}
                                                showPreviews={showAllPreviews}
                                                onPreviewClick={(asset) => setLightboxConfig({isOpen: true, asset: asset, source: 'generated'})}
                                                onStop={handleStopGeneration}
                                                onDelete={() => addNotification("Cannot delete a default prompt.", "error")}
                                                onStartEdit={setEditingPrompt}
                                                onSaveEdit={handleSaveEditedPrompt}
                                                onCancelEdit={() => setEditingPrompt(null)}
                                                editingState={editingPrompt}
                                                onUpdateEditingPrompt={setEditingPrompt}
                                                isBatchMode={isBatchMode}
                                                onSetAspectRatio={(promptId, ratio) => {
                                                    addNotification("Default prompts must be edited to save changes. A custom copy will be created.", "info");
                                                    const defaultPrompt = allPrompts.find(p => p.id === promptId);
                                                    if (defaultPrompt) {
                                                        const newCustomPrompt: CustomPrompt = {...defaultPrompt, id: crypto.randomUUID(), aspectRatio: ratio, folderId: activePromptFolderId, createdAt: Date.now()};
                                                        updateActiveProject(p => ({...p, customPrompts: [newCustomPrompt, ...p.customPrompts]}));
                                                        setSelectedPrompts(s => s.map(id => id === promptId ? newCustomPrompt.id : id));
                                                    }
                                                }}
                                                onAddReferenceClick={(promptId) => setIsReferenceSelectorOpen(promptId)}
                                            />
                                        })}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </main>
                </div>
            </div>

            <WizardModal 
                isOpen={isWizardOpen} 
                onClose={() => setIsWizardOpen(false)} 
                onGenerate={handleWizardGenerate}
                addNotification={addNotification}
                devMode={devMode}
                existingPrompts={activeProject?.customPrompts || []}
            />

            <CoffeeModal 
                isOpen={isCoffeeModalOpen}
                onClose={() => setIsCoffeeModalOpen(false)}
            />

            <PhotoGallery 
                project={activeProject}
                user={user}
                isVisible={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelectFolder={folderId => updateUser(u => ({...u, activeAssetFolderId: folderId}))}
                onFolderAction={(action, folderId) => handleFolderAction(action, folderId, 'asset')}
                selectedImageIds={selectedImageIds}
                setSelectedImageIds={setSelectedImageIds}
                onAssetClick={(asset) => setLightboxConfig({isOpen: true, asset, source: 'generated'})}
                onMagicEdit={(asset) => setEditorConfig({isOpen: true, asset})}
                addNotification={addNotification}
                onAssetUpdate={handleAssetUpdate}
                onDeleteAssets={handleDeleteGeneratedAssets}
                onMoveAssets={handleMoveAssetsToFolder}
                activeFolderId={activeAssetFolderId}
                onOpenBatchEditor={() => setIsBatchEditorOpen(true)}
                undoUser={undoUser}
                redoUser={redoUser}
                canUndo={canUndo}
                canRedo={canRedo}
                onMoveFolderToProject={handleMoveFolderToProject}
                onSwitchProject={handleSwitchProject}
            />
            
            <ImageViewer 
                isOpen={lightboxConfig.isOpen} 
                asset={lightboxConfig.asset}
                // Fix: Filter reference assets to only include images for the viewer.
                allAssets={lightboxConfig.source === 'generated' 
                    ? (activeProject?.generatedAssets || []) 
                    : ((activeProject?.referenceAssets || []).filter(a => a.type === 'image') as ReferenceImage[])}
                onClose={() => setLightboxConfig({isOpen: false, asset: null, source: 'generated'})}
                onUpdateAsset={handleUpdateFromViewer}
                onDeleteAsset={handleDeleteFromViewer}
                onMagicEdit={(asset) => setEditorConfig({isOpen: true, asset})}
                onSelectAsset={(id, isSelected) => setSelectedImageIds(prev => {
                    const newSet = new Set(prev);
                    if(isSelected) newSet.add(id); else newSet.delete(id);
                    return newSet;
                })}
                isSelected={!!lightboxConfig.asset && selectedImageIds.has(lightboxConfig.asset.id)}
            />
            
            <ImageEditorModal 
                isOpen={editorConfig.isOpen}
                asset={editorConfig.asset}
                allAssets={activeProject?.generatedAssets || []}
                onClose={() => setEditorConfig({isOpen: false, asset: null})}
                onSave={handleSaveEditedImage}
                addNotification={addNotification}
                devMode={devMode}
            />

            <BatchEditorModal 
                isOpen={isBatchEditorOpen}
                onClose={() => setIsBatchEditorOpen(false)}
                assets={selectedAssetsForBatchEdit}
                onSave={handleSaveBatchEdits}
                addNotification={addNotification}
                devMode={devMode}
            />
            
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                isBatchMode={isBatchMode}
                setIsBatchMode={setIsBatchMode}
                showAllPreviews={showAllPreviews}
                setShowAllPreviews={setShowAllPreviews}
                defaultAspectRatio={defaultAspectRatio}
                setDefaultAspectRatio={setDefaultAspectRatio}
                batchGenerationCount={batchGenerationCount}
                setBatchGenerationCount={setBatchGenerationCount}
                devMode={devMode}
                setDevMode={setDevMode}
                confirmOnDelete={confirmOnDelete}
                setConfirmOnDelete={setConfirmOnDelete}
                apiKey={user?.apiKey}
                setApiKey={(key) => updateUser(u => ({...u, apiKey: key}))}
                localStoragePath={user?.localStoragePath}
                setLocalStoragePath={(path) => updateUser(u => ({...u, localStoragePath: path}))}
            />

            <ReferenceAssetSelectorModal
                isOpen={!!isReferenceSelectorOpen}
                onClose={() => setIsReferenceSelectorOpen(null)}
                project={activeProject}
                prompt={isReferenceSelectorOpen === '__BATCH_MODE__' ? {id: '__BATCH_MODE__', name: 'Batch Mode', version: '', text: '', tags: [], folderId: null, referenceAssetIds: [], createdAt: 0} : allPrompts.find(p => p.id === isReferenceSelectorOpen)}
                onSave={handleSetPromptReferences}
            />

             <RenameModal
                isOpen={!!renameTarget}
                onClose={() => setRenameTarget(null)}
                onSave={handleRenameSave}
                title={!renameTarget?.id ? `Create New ${renameTarget?.type}` : `Rename ${renameTarget?.type}`}
                initialName={renameTarget?.name || ""}
                showProjectSelector={renameTarget?.type === 'folder' && !!renameTarget?.id}
                projects={user?.projects || []}
                currentProjectId={activeProject?.id}
            />
            <ConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                title={`Delete ${deleteTarget?.type}`}
            >
                Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!deleteAssetsTarget}
                onClose={() => setDeleteAssetsTarget(null)}
                onConfirm={() => handleConfirmDeleteAssets(deleteAssetsTarget || [])}
                title={`Delete ${deleteAssetsTarget?.length || 0} Item(s)`}
                confirmText="Delete"
            >
                Are you sure you want to permanently delete the selected items? This action cannot be undone.
            </ConfirmationModal>
        </div>
    );
}
