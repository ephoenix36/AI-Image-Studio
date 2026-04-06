
import React, { useState } from 'react';
import type { Folder, Project } from '@/types/types';
import { Icon } from '@/components/Icon';
import { ICONS } from '@/constants';

interface FolderTreeProps {
    folders: Folder[];
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
    onFolderAction: (action: 'create' | 'rename' | 'delete', folderId: string | null) => void;
    onDrop: (folderId: string | null) => void;
    itemCounts?: Record<string, number>;
    rootLabel?: string;
    projects?: Project[];
    onMoveFolderToProject?: (folderId: string, projectId: string) => void;
}

const FolderItem: React.FC<{
    folder: Folder;
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
    onFolderAction: (action: 'create' | 'rename' | 'delete', folderId: string | null) => void;
    onDrop: (folderId: string | null) => void;
    count?: number;
    projects?: Project[];
    onMoveFolderToProject?: (folderId: string, projectId: string) => void;
}> = ({ folder, selectedFolderId, onSelectFolder, onFolderAction, onDrop, count, projects, onMoveFolderToProject }) => {
    const [isDropping, setIsDropping] = useState(false);
    const [showProjectMenu, setShowProjectMenu] = useState(false);
    
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDropping(true); };
    const handleDragLeave = () => setIsDropping(false);
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDropping(false); onDrop(folder.id); };

    return (
        <div className="relative">
            <div 
                onClick={() => onSelectFolder(folder.id)}
                onDragOver={handleDragOver} 
                onDragLeave={handleDragLeave} 
                onDrop={handleDrop}
                draggable={!!projects && projects.length > 1}
                onDragStart={(e) => {
                    if (projects && projects.length > 1) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('folderId', folder.id);
                    }
                }}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition-colors 
                    ${selectedFolderId === folder.id ? 'bg-cyan-600/30 text-white' : 'hover:bg-slate-700'}
                    ${isDropping ? 'bg-blue-500/50' : ''}`}
            >
                <div className="flex items-center gap-2 truncate">
                    <Icon path={ICONS.FOLDER} className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate text-sm">{folder.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                     {typeof count === 'number' && (
                        <span className="text-xs text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        {projects && projects.length > 1 && onMoveFolderToProject && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowProjectMenu(!showProjectMenu); }} 
                                className="p-1 hover:text-white text-slate-400"
                                title="Move to project"
                            >
                                <Icon path={ICONS.FOLDER} className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onFolderAction('rename', folder.id); }} className="p-1 hover:text-white text-slate-400"><Icon path={ICONS.EDIT} className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); onFolderAction('delete', folder.id); }} className="p-1 hover:text-red-400 text-slate-400"><Icon path={ICONS.TRASH} className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
            
            {/* Project selector dropdown */}
            {showProjectMenu && projects && onMoveFolderToProject && (
                <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg z-10 min-w-[200px]" onClick={e => e.stopPropagation()}>
                    <div className="p-2 border-b border-slate-600 text-xs text-slate-400">Move to project:</div>
                    {projects.map(proj => (
                        <button
                            key={proj.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveFolderToProject(folder.id, proj.id);
                                setShowProjectMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors"
                        >
                            {proj.name}
                        </button>
                    ))}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowProjectMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 border-t border-slate-600"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
};


export const FolderTree: React.FC<FolderTreeProps> = ({ folders, selectedFolderId, onSelectFolder, onFolderAction, onDrop, itemCounts, rootLabel, projects, onMoveFolderToProject }) => {
    const rootFolders = folders.filter(f => f.parentId === null);
    
    const [isDroppingRoot, setIsDroppingRoot] = useState(false);
    const handleDragOverRoot = (e: React.DragEvent) => { e.preventDefault(); setIsDroppingRoot(true); };
    const handleDragLeaveRoot = () => setIsDroppingRoot(false);
    const handleDropRoot = (e: React.DragEvent) => { e.preventDefault(); setIsDroppingRoot(false); onDrop(null); };

    const allItemsCount = itemCounts ? Object.values(itemCounts).reduce((sum: number, count: number) => sum + count, 0) : undefined;

    return (
        <div className="space-y-1">
             {rootLabel && <div onClick={() => onSelectFolder(null)}
                onDragOver={handleDragOverRoot} onDragLeave={handleDragLeaveRoot} onDrop={handleDropRoot}
                className={`flex items-center justify-between gap-2 p-2 rounded-md cursor-pointer transition-colors group
                ${selectedFolderId === null ? 'bg-cyan-600/30 text-white' : 'hover:bg-slate-700'}
                ${isDroppingRoot ? 'bg-blue-500/50' : ''}`}>
                <div className="flex items-center gap-2 truncate">
                    <Icon path={ICONS.GRID} className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate text-sm font-semibold">{rootLabel || 'All Items'}</span>
                </div>
                {typeof allItemsCount === 'number' && (
                    <span className="text-xs text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{allItemsCount}</span>
                )}
            </div>}
            {rootFolders.map(folder => (
                <FolderItem key={folder.id} folder={folder} {...{ selectedFolderId, onSelectFolder, onFolderAction, onDrop, projects, onMoveFolderToProject }} count={itemCounts?.[folder.id]} />
            ))}
        </div>
    );
};
