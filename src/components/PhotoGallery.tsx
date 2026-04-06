

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { GeneratedAsset, Project, Folder, ReferenceAsset, ReferenceImage } from '@/types/types';
import { Icon } from '@/components/Icon';
import { ICONS } from '@/constants';
import { sanitizeFilename, useBodyScrollLock } from '@/utils/utils';
import { FolderTree } from '@/components/FolderTree';

declare global {
    interface Window { JSZip: any; }
}

const MoveAssetsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onMove: (folderId: string | null) => void;
    folders: Folder[];
    assetCount: number;
}> = ({ isOpen, onClose, onMove, folders, assetCount }) => {
    const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
    useBodyScrollLock(isOpen);

    if (!isOpen) return null;

    const handleMove = () => {
        onMove(selectedFolderId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-md max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-semibold">Move {assetCount} Item(s)</h2>
                    <p className="text-sm text-slate-400">Select a destination folder.</p>
                </div>
                <div className="p-4 flex-grow overflow-y-auto custom-scroll">
                    <FolderTree folders={folders} selectedFolderId={selectedFolderId} onSelectFolder={setSelectedFolderId} onFolderAction={() => {}} onDrop={() => {}} rootLabel="Home" />
                </div>
                <div className="p-4 flex justify-end gap-3 border-t border-slate-700">
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition">Cancel</button>
                    <button onClick={handleMove} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md transition">Move Here</button>
                </div>
            </div>
        </div>
    );
};


interface PhotoGalleryProps {
    project: Project | undefined;
    user: { projects: Project[] };
    isVisible: boolean;
    onClose: () => void;
    onSelectFolder: (folderId: string | null) => void;
    onFolderAction: (action: 'create' | 'rename' | 'delete', folderId: string | null) => void;
    selectedImageIds: Set<string>;
    setSelectedImageIds: (ids: Set<string>) => void;
    onAssetClick: (asset: GeneratedAsset | ReferenceImage) => void;
    onMagicEdit: (asset: GeneratedAsset | ReferenceImage) => void;
    addNotification: (message: string, type?: 'info' | 'error') => void;
    onAssetUpdate: (asset: GeneratedAsset) => void;
    onDeleteAssets: (assetIds: string[]) => void;
    onMoveAssets: (assetIds: string[], folderId: string | null) => void;
    activeFolderId: string | null;
    onOpenBatchEditor: () => void;
    undoUser: () => void;
    redoUser: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onMoveFolderToProject?: (folderId: string, projectId: string) => void;
    onSwitchProject?: (projectId: string) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
    project, user, isVisible, onClose, onSelectFolder, onFolderAction,
    selectedImageIds, setSelectedImageIds, onAssetClick, onMagicEdit, 
    addNotification, onAssetUpdate, onDeleteAssets, onMoveAssets, activeFolderId,
    onOpenBatchEditor, undoUser, redoUser, canUndo, canRedo, onMoveFolderToProject, onSwitchProject
}) => {
    useBodyScrollLock(isVisible);
    
    useEffect(() => {
        if (!isVisible) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isVisible, onClose]);
    
    const assets = project?.generatedAssets || [];
    const folders = project?.folders.filter(f => f.type === 'asset') || [];
    const referenceAssets = project?.referenceAssets || [];
    
    const allImageAssets = useMemo(() => {
        const refImages = referenceAssets.filter(a => a.type === 'image') as ReferenceImage[];
        return [...assets, ...refImages];
    }, [assets, referenceAssets]);


    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const [filter, setFilter] = useState('');
    const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isSelectAll, setIsSelectAll] = useState(false);
    const [groupByPrompt, setGroupByPrompt] = useState(false);
    
    const lastClickedId = useRef<string | null>(null);

    const filteredAndSortedAssets = useMemo(() => {
        let visibleAssets = activeFolderId === null 
            ? allImageAssets
            : allImageAssets.filter(a => a.folderId === activeFolderId);
        
        return visibleAssets
            .filter(asset => {
                const nameMatch = asset.name.toLowerCase().includes(filter.toLowerCase());
                const promptMatch = 'prompt' in asset && asset.prompt.toLowerCase().includes(filter.toLowerCase());
                return nameMatch || promptMatch;
            })
            .sort((a, b) => {
                const aVal = a[sortBy];
                const bVal = b[sortBy];
                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
    }, [allImageAssets, filter, sortBy, sortOrder, activeFolderId]);
    
    // Group images by prompt if groupByPrompt is enabled
    const groupedByPrompt = useMemo(() => {
        if (!groupByPrompt) return null;
        
        const groups = new Map<string, (GeneratedAsset | ReferenceImage)[]>();
        
        filteredAndSortedAssets.forEach(asset => {
            if ('prompt' in asset) {
                // Normalize prompt text to group similar prompts together
                const normalizedPrompt = asset.prompt.trim().toLowerCase();
                if (!groups.has(normalizedPrompt)) {
                    groups.set(normalizedPrompt, []);
                }
                groups.get(normalizedPrompt)!.push(asset);
            }
        });
        
        return Array.from(groups.entries()).map(([prompt, assets]) => ({
            prompt,
            originalPrompt: assets[0] && 'prompt' in assets[0] ? assets[0].prompt : prompt,
            assets
        }));
    }, [filteredAndSortedAssets, groupByPrompt]);

    const handleSelect = (assetId: string, e: React.MouseEvent) => {
        const newSelectedIds = new Set(selectedImageIds);
        if (e.shiftKey && lastClickedId.current) {
            const lastIndex = filteredAndSortedAssets.findIndex(a => a.id === lastClickedId.current);
            const currentIndex = filteredAndSortedAssets.findIndex(a => a.id === assetId);
            if (lastIndex > -1 && currentIndex > -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                for (let i = start; i <= end; i++) {
                    newSelectedIds.add(filteredAndSortedAssets[i].id);
                }
            }
        } else {
            if (newSelectedIds.has(assetId)) {
                newSelectedIds.delete(assetId);
            } else {
                newSelectedIds.add(assetId);
            }
        }
        setSelectedImageIds(newSelectedIds);
        lastClickedId.current = assetId;
    };

    const handleSelectAll = useCallback(() => {
        if (isSelectAll) {
            setSelectedImageIds(new Set());
        } else {
            setSelectedImageIds(new Set(filteredAndSortedAssets.map(a => a.id)));
        }
        setIsSelectAll(!isSelectAll);
    }, [isSelectAll, filteredAndSortedAssets, setSelectedImageIds]);

    useEffect(() => {
        setIsSelectAll(selectedImageIds.size === filteredAndSortedAssets.length && filteredAndSortedAssets.length > 0);
    }, [selectedImageIds, filteredAndSortedAssets]);

    const handleDownloadSelected = async () => {
        if (selectedImageIds.size === 0) return;
        addNotification(`Preparing ${selectedImageIds.size} images for download...`, 'info');
        const zip = new window.JSZip();
        for (const asset of filteredAndSortedAssets) {
            if (selectedImageIds.has(asset.id)) {
                try {
                    const imageUrl = 'imageUrl' in asset ? asset.imageUrl : asset.previewUrl;
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    zip.file(`${sanitizeFilename(asset.name)}.png`, blob);
                } catch (e) {
                    addNotification(`Failed to download: ${asset.name}`, 'error');
                }
            }
        }
        zip.generateAsync({ type: "blob" }).then((content: Blob) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `AI_Studio_Export_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addNotification('Download started!', 'info');
        });
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex flex-col z-50 text-white">
            <header className="px-6 py-2 border-b border-slate-700 flex-shrink-0 relative">
                <button onClick={onClose} className="absolute top-3 right-4 text-3xl text-slate-400 hover:text-white z-10">&times;</button>
                
                <div className="flex flex-wrap justify-between items-center gap-4 pr-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold">Photo Gallery</h2>
                        <div className="flex items-center gap-2 p-1 bg-slate-800 rounded-lg">
                            <button onClick={undoUser} disabled={!canUndo} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"><Icon path={ICONS.UNDO} /></button>
                            <button onClick={redoUser} disabled={!canRedo} className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"><Icon path={ICONS.REDO} /></button>
                        </div>
                    </div>
                   <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                    <Icon path={ICONS.SEARCH} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)} 
                        className="bg-slate-800 border border-slate-600 rounded-full pl-10 pr-4 py-2 w-64 sm:w-96 text-md" 
                    />
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm">
                    <option value="createdAt">Date Created</option>
                    <option value="name">Name</option>
                </select>
                <button onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')} className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm">
                    {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
                <button 
                    onClick={() => setGroupByPrompt(!groupByPrompt)} 
                    className={`px-3 py-1.5 rounded-md text-sm transition ${groupByPrompt ? 'bg-cyan-600 text-white' : 'bg-slate-800 border border-slate-600'}`}
                >
                    Group by Prompt
                </button>
            </div>
                </div>
            </header>
            
            {isSidebarCollapsed && (
                <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="absolute top-1/2 left-0 transform -translate-y-1/2 bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-r-md z-10 shadow-lg"
                    aria-label="Open sidebar"
                >
                    <Icon path={ICONS.CHEVRON_RIGHT} className="w-6 h-6" />
                </button>
            )}

            <div className="flex-grow flex min-h-0">
                <aside className={`flex-shrink-0 border-r border-slate-700 overflow-y-auto custom-scroll transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0 p-0 border-r-0 opacity-0' : 'w-64 p-4 opacity-100'}`}>
                    <div className="mb-4">
                        <label className="text-xs text-slate-400 mb-1 block">Project</label>
                        <select 
                            value={project?.id || ''} 
                            onChange={(e) => {
                                if (onSwitchProject) {
                                    onSwitchProject(e.target.value);
                                }
                            }}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm"
                        >
                            {user.projects.map(proj => (
                                <option key={proj.id} value={proj.id}>{proj.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => onFolderAction('create', null)} className="flex-1 text-sm bg-slate-700 hover:bg-slate-600 py-2 px-4 rounded-md">New Folder</button>
                        <button onClick={() => setIsSidebarCollapsed(p => !p)} className="p-2 ml-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                            <Icon path={ICONS.CHEVRON_LEFT} className="w-6 h-6" />
                        </button>
                    </div>
                    <FolderTree 
                        folders={folders} 
                        selectedFolderId={activeFolderId} 
                        onSelectFolder={onSelectFolder} 
                        onFolderAction={onFolderAction} 
                        onDrop={(folderId) => onMoveAssets(Array.from(selectedImageIds), folderId)} 
                        projects={user.projects}
                        onMoveFolderToProject={onMoveFolderToProject}
                    />
                </aside>
                
                <main className="flex-1 flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0 flex-wrap gap-3">
                        <div>
                            <button onClick={handleSelectAll} className={`text-sm font-semibold py-1.5 px-3 rounded-md transition ${isSelectAll ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                {isSelectAll ? 'Deselect All' : 'Select All'}
                            </button>
                            <span className="ml-4 text-sm text-slate-400">{selectedImageIds.size} of {filteredAndSortedAssets.length} selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={onOpenBatchEditor} disabled={selectedImageIds.size === 0} className="text-sm font-semibold py-1.5 px-3 rounded-md transition flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">
                                <Icon path={ICONS.EDIT} className="w-4 h-4" />
                                Batch Edit
                            </button>
                            <button onClick={() => setIsMoveModalOpen(true)} disabled={selectedImageIds.size === 0} className="text-sm font-semibold py-1.5 px-3 rounded-md transition flex items-center gap-1.5 bg-slate-600 hover:bg-slate-500 text-white disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">
                                <Icon path={ICONS.FOLDER} className="w-4 h-4" />
                                Move
                            </button>
                            <button onClick={handleDownloadSelected} disabled={selectedImageIds.size === 0} className="text-sm font-semibold py-1.5 px-3 rounded-md transition flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">
                                <Icon path={ICONS.DOWNLOAD} className="w-4 h-4" />
                                Download
                            </button>
                             <button onClick={() => onDeleteAssets(Array.from(selectedImageIds))} disabled={selectedImageIds.size === 0} className="text-sm font-semibold py-1.5 px-3 rounded-md transition flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">
                                <Icon path={ICONS.TRASH} className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scroll flex-grow">
                        {filteredAndSortedAssets.length > 0 ? (
                            groupByPrompt && groupedByPrompt ? (
                                // Grouped by prompt view
                                <div className="space-y-8">
                                    {groupedByPrompt.map((group, idx) => (
                                        <div key={idx} className="space-y-3">
                                            <div className="flex items-start gap-3 pb-2 border-b border-slate-700">
                                                <Icon path={ICONS.SPARKLES} className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-300 font-medium">Prompt:</p>
                                                    <p className="text-sm text-slate-400 italic">{group.originalPrompt}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{group.assets.length} image{group.assets.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-5">
                                                {group.assets.map(asset => {
                                                    const isSelected = selectedImageIds.has(asset.id);
                                                    const imageUrl = 'imageUrl' in asset ? asset.imageUrl : asset.previewUrl;
                                                    return (
                                                        <div 
                                                            key={asset.id} 
                                                            className="relative group/asset cursor-pointer aspect-square" 
                                                            onClick={(e) => handleSelect(asset.id, e)}
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                onAssetClick(asset);
                                                            }}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                e.dataTransfer.effectAllowed = 'move';
                                                                e.dataTransfer.setData('text/plain', asset.id);
                                                                if (!selectedImageIds.has(asset.id)) {
                                                                    setSelectedImageIds(new Set([asset.id]));
                                                                }
                                                            }}
                                                        >
                                                            <img src={imageUrl} alt={asset.name} className="w-full h-full object-cover rounded-lg bg-slate-800" />
                                                            <div className={`absolute inset-0 rounded-lg transition-all ${isSelected ? 'ring-4 ring-blue-500' : 'group-hover/asset:ring-4 group-hover/asset:ring-slate-500'}`}></div>
                                                            <div className="absolute top-2 left-2 w-5 h-5 rounded-sm border-2 border-white flex items-center justify-center transition" style={{ backgroundColor: isSelected ? '#3b82f6' : 'rgba(0,0,0,0.3)' }}>
                                                                {isSelected && <Icon path={ICONS.CHECK} className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg opacity-0 group-hover/asset:opacity-100 transition-opacity">
                                                                <p className="text-xs text-white truncate">{asset.name}</p>
                                                            </div>
                                                            <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover/asset:opacity-100 transition-opacity">
                                                                <button onClick={(e)=>{ e.stopPropagation(); onAssetClick(asset); }} className="w-7 h-7 flex items-center justify-center bg-slate-800/70 hover:bg-slate-700 rounded-md"><Icon path={ICONS.SEARCH} className="w-4 h-4" /></button>
                                                                <button onClick={(e)=>{ e.stopPropagation(); onMagicEdit(asset); }} className="w-7 h-7 flex items-center justify-center bg-slate-800/70 hover:bg-slate-700 rounded-md text-cyan-400"><Icon path={ICONS.SPARKLES} className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Standard grid view
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-5">
                                    {filteredAndSortedAssets.map(asset => {
                                        const isSelected = selectedImageIds.has(asset.id);
                                        const imageUrl = 'imageUrl' in asset ? asset.imageUrl : asset.previewUrl;
                                        return (
                                            <div 
                                                key={asset.id} 
                                                className="relative group/asset cursor-pointer aspect-square" 
                                                onClick={(e) => handleSelect(asset.id, e)}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    onAssetClick(asset);
                                                }}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    e.dataTransfer.setData('text/plain', asset.id);
                                                    // If the asset being dragged is not in selection, select it
                                                    if (!selectedImageIds.has(asset.id)) {
                                                        setSelectedImageIds(new Set([asset.id]));
                                                    }
                                                }}
                                            >
                                                <img src={imageUrl} alt={asset.name} className="w-full h-full object-cover rounded-lg bg-slate-800" />
                                                <div className={`absolute inset-0 rounded-lg transition-all ${isSelected ? 'ring-4 ring-blue-500' : 'group-hover/asset:ring-4 group-hover/asset:ring-slate-500'}`}></div>
                                                <div className="absolute top-2 left-2 w-5 h-5 rounded-sm border-2 border-white flex items-center justify-center transition" style={{ backgroundColor: isSelected ? '#3b82f6' : 'rgba(0,0,0,0.3)' }}>
                                                    {isSelected && <Icon path={ICONS.CHECK} className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg opacity-0 group-hover/asset:opacity-100 transition-opacity">
                                                    <p className="text-xs text-white truncate">{asset.name}</p>
                                                </div>
                                                <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover/asset:opacity-100 transition-opacity">
                                                    <button onClick={(e)=>{ e.stopPropagation(); onAssetClick(asset); }} className="w-7 h-7 flex items-center justify-center bg-slate-800/70 hover:bg-slate-700 rounded-md"><Icon path={ICONS.SEARCH} className="w-4 h-4" /></button>
                                                    <button onClick={(e)=>{ e.stopPropagation(); onMagicEdit(asset); }} className="w-7 h-7 flex items-center justify-center bg-slate-800/70 hover:bg-slate-700 rounded-md text-cyan-400"><Icon path={ICONS.SPARKLES} className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                             <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center text-slate-500">
                                    <Icon path={ICONS.IMAGE_COPY} className="w-16 h-16 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold">No images found</h3>
                                    <p className="mt-1">{activeFolderId ? "This folder is empty." : "Try generating some new images!"}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
             <MoveAssetsModal 
                isOpen={isMoveModalOpen} 
                onClose={() => setIsMoveModalOpen(false)}
                onMove={(folderId) => onMoveAssets(Array.from(selectedImageIds), folderId)}
                folders={folders}
                assetCount={selectedImageIds.size}
            />
        </div>
    );
};
