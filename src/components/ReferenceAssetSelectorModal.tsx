
import React, { useState, useEffect, useMemo } from 'react';
import type { Project, CustomPrompt, ReferenceAsset, GeneratedAsset, Folder } from '@/types/types';
import { Icon } from '@/components/Icon';
import { ICONS } from '@/constants';
import { FolderTree } from '@/components/FolderTree';
import { useBodyScrollLock } from '@/utils/utils';

interface ReferenceAssetSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | undefined;
    prompt: CustomPrompt | undefined;
    onSave: (promptId: string, refIds: string[]) => void;
}

export const ReferenceAssetSelectorModal: React.FC<ReferenceAssetSelectorModalProps> = ({ isOpen, onClose, project, prompt, onSave }) => {
    useBodyScrollLock(isOpen);
    
    // Bug fix: This guard must be the first thing in the component.
    if (!isOpen || !prompt) return null;

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'reference' | 'generated'>('reference');
    const [activeGeneratedFolderId, setActiveGeneratedFolderId] = useState<string | null>(null);

    useEffect(() => {
        if (prompt?.id !== '__BATCH_MODE__' && prompt?.referenceAssetIds) {
            setSelectedIds(new Set(prompt.referenceAssetIds));
        } else {
            setSelectedIds(new Set());
        }
    }, [prompt, isOpen]);

    const handleToggle = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSave = () => {
        if (prompt) {
            onSave(prompt.id, Array.from(selectedIds));
            onClose();
        }
    };

    const referenceAssets = project?.referenceAssets || [];
    const generatedAssets = project?.generatedAssets || [];
    const assetFolders = project?.folders.filter(f => f.type === 'asset') || [];
    const isBatchMode = prompt.id === '__BATCH_MODE__';

    const filteredGeneratedAssets = useMemo(() =>
        activeGeneratedFolderId === null
            ? generatedAssets
            : generatedAssets.filter(a => a.folderId === activeGeneratedFolderId),
        [generatedAssets, activeGeneratedFolderId]
    );

    const folderItemCounts = useMemo(() => {
        if (!project) return {};
        const counts: Record<string, number> = {};
        const allContent = [
            ...(project.generatedAssets || []),
            ...(project.referenceAssets || []),
            ...(project.customPrompts || [])
        ];
        allContent.forEach(item => {
            const folderId = item.folderId || '__root__'; // key for root items
            counts[folderId] = (counts[folderId] || 0) + 1;
        });
        return counts;
    }, [project]);

    const TabButton = ({ tab, label }: { tab: 'reference' | 'generated', label: string }) => (
        <button 
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${activeTab === tab ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-semibold">{isBatchMode ? 'Select References for Batch' : 'Select Reference Assets'}</h2>
                    <p className="text-sm text-slate-400 truncate mt-1">
                        {isBatchMode ? `These will be added to all selected prompts.` : `For prompt: "${prompt.name}"`}
                    </p>
                </div>
                <div className="flex-grow flex min-h-0">
                    {activeTab === 'generated' && (
                        <div className="w-56 border-r border-slate-700 p-2 flex-shrink-0 overflow-y-auto custom-scroll">
                           <FolderTree folders={assetFolders} selectedFolderId={activeGeneratedFolderId} onSelectFolder={setActiveGeneratedFolderId} onFolderAction={()=>{}} onDrop={()=>{}} itemCounts={folderItemCounts} rootLabel="Home" />
                        </div>
                    )}
                    <div className="flex-grow flex flex-col">
                         <div className="px-4 border-b border-slate-700 flex-shrink-0">
                            <TabButton tab="reference" label={`Reference Assets (${referenceAssets.length})`} />
                            <TabButton tab="generated" label={`Generated Images (${generatedAssets.length})`} />
                        </div>
                        <div className="p-4 flex-grow overflow-y-auto custom-scroll">
                            {activeTab === 'reference' && (
                                <>
                                {referenceAssets.length === 0 ? (
                                    <div className="text-center text-slate-500 py-10">
                                        <p>No reference assets found in this project.</p>
                                        <p className="text-sm">Upload images or documents in the Studio Controls panel.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                        {referenceAssets.map(asset => {
                                            const isSelected = selectedIds.has(asset.id);
                                            return (
                                                <div key={asset.id} onClick={() => handleToggle(asset.id)}
                                                    className={`relative rounded-lg cursor-pointer aspect-square bg-slate-900/50 group ring-2 ${isSelected ? 'ring-cyan-400' : 'ring-transparent'}`}>
                                                    {asset.type === 'image' && <img src={asset.previewUrl} alt={asset.name} className="w-full h-full object-cover rounded-md" />}
                                                    {asset.type === 'document' && (
                                                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                                            <Icon path={ICONS.FILE} className="w-8 h-8 text-slate-400 mb-2"/>
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 rounded-b-md">
                                                        <p className="text-xs text-white truncate text-center">{asset.name}</p>
                                                    </div>
                                                    {isSelected && <div className="absolute top-1 right-1 bg-cyan-400 rounded-full p-0.5"><Icon path={ICONS.CHECK} className="w-4 h-4 text-slate-900"/></div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                </>
                            )}
                             {activeTab === 'generated' && (
                                <>
                                {filteredGeneratedAssets.length === 0 ? (
                                    <div className="text-center text-slate-500 py-10">
                                        <p>{activeGeneratedFolderId ? "This folder is empty." : "Select a folder to view generated images."}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                        {filteredGeneratedAssets.map(asset => {
                                            const isSelected = selectedIds.has(asset.id);
                                            return (
                                                <div key={asset.id} onClick={() => handleToggle(asset.id)}
                                                    className={`relative rounded-lg cursor-pointer aspect-square bg-slate-900/50 group ring-2 ${isSelected ? 'ring-cyan-400' : 'ring-transparent'}`}>
                                                    <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover rounded-md" />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 rounded-b-md">
                                                        <p className="text-xs text-white truncate text-center">{asset.name}</p>
                                                    </div>
                                                    {isSelected && <div className="absolute top-1 right-1 bg-cyan-400 rounded-full p-0.5"><Icon path={ICONS.CHECK} className="w-4 h-4 text-slate-900"/></div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition">Cancel</button>
                    <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md transition">Save ({selectedIds.size}) References</button>
                </div>
            </div>
        </div>
    );
};
