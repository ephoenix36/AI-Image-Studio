
import React, { useState } from 'react';
import type { Folder } from '../types';
import { Icon } from './Icon';
import { ICONS } from '../constants';

interface FolderTreeProps {
    folders: Folder[];
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
    onFolderAction: (action: 'create' | 'rename' | 'delete', folderId: string | null) => void;
    onDrop: (folderId: string | null) => void;
    itemCounts?: Record<string, number>;
    rootLabel?: string;
}

const FolderItem: React.FC<{
    folder: Folder;
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
    onFolderAction: (action: 'create' | 'rename' | 'delete', folderId: string | null) => void;
    onDrop: (folderId: string | null) => void;
    count?: number;
}> = ({ folder, selectedFolderId, onSelectFolder, onFolderAction, onDrop, count }) => {
    const [isDropping, setIsDropping] = useState(false);
    
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDropping(true); };
    const handleDragLeave = () => setIsDropping(false);
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDropping(false); onDrop(folder.id); };

    return (
        <div onClick={() => onSelectFolder(folder.id)}
             onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
             className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition-colors 
                ${selectedFolderId === folder.id ? 'bg-cyan-600/30 text-white' : 'hover:bg-slate-700'}
                ${isDropping ? 'bg-blue-500/50' : ''}`}>
            <div className="flex items-center gap-2 truncate">
                <Icon path={ICONS.FOLDER} className="w-5 h-5 flex-shrink-0" />
                <span className="truncate text-sm">{folder.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                 {typeof count === 'number' && (
                    <span className="text-xs text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onFolderAction('rename', folder.id); }} className="p-1 hover:text-white text-slate-400"><Icon path={ICONS.EDIT} className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onFolderAction('delete', folder.id); }} className="p-1 hover:text-red-400 text-slate-400"><Icon path={ICONS.TRASH} className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};


export const FolderTree: React.FC<FolderTreeProps> = ({ folders, selectedFolderId, onSelectFolder, onFolderAction, onDrop, itemCounts, rootLabel }) => {
    const rootFolders = folders.filter(f => f.parentId === null);
    
    const [isDroppingRoot, setIsDroppingRoot] = useState(false);
    const handleDragOverRoot = (e: React.DragEvent) => { e.preventDefault(); setIsDroppingRoot(true); };
    const handleDragLeaveRoot = () => setIsDroppingRoot(false);
    const handleDropRoot = (e: React.DragEvent) => { e.preventDefault(); setIsDroppingRoot(false); onDrop(null); };

    const allItemsCount = itemCounts ? Object.values(itemCounts).reduce((sum: number, count: number) => sum + count, 0) : undefined;

    return (
        <div className="space-y-1">
             <div onClick={() => onSelectFolder(null)}
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
            </div>
            {rootFolders.map(folder => (
                <FolderItem key={folder.id} folder={folder} {...{ selectedFolderId, onSelectFolder, onFolderAction, onDrop }} count={itemCounts?.[folder.id]} />
            ))}
        </div>
    );
};