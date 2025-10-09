
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { GeneratedAsset, CustomPrompt, CustomPromptHistory } from '../types';
import { ICONS, ASPECT_RATIOS } from '../constants';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

interface PromptCardProps {
    prompt: CustomPrompt;
    subjectDescription: string;
    onGenerate: (promptText: string, promptId: string) => void;
    onCopy: (promptText: string) => void;
    onSelectPrompt: (promptId: string, e: React.MouseEvent) => void;
    isPromptSelected: boolean;
    isLoading?: boolean;
    assets: GeneratedAsset[];
    showPreviews: boolean;
    onPreviewClick: (asset: GeneratedAsset) => void;
    onStop: (promptId: string) => void;
    onDelete: (promptId: string) => void;
    onStartEdit: (prompt: CustomPrompt) => void;
    onSaveEdit: (prompt: CustomPrompt) => void;
    onCancelEdit: () => void;
    editingState: CustomPrompt | null;
    onUpdateEditingPrompt: (updatedPrompt: CustomPrompt) => void;
    isBatchMode: boolean;
    onSetAspectRatio: (promptId: string, ratio: string) => void;
    onAddReferenceClick: (promptId: string) => void;
    onMoveToFolder?: (promptId: string) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
    prompt, subjectDescription, onGenerate, onCopy, onSelectPrompt, 
    isPromptSelected, isLoading, assets = [], showPreviews, onPreviewClick, onStop,
    onDelete, onStartEdit, onSaveEdit, onCancelEdit, editingState, onUpdateEditingPrompt,
    isBatchMode, onSetAspectRatio, onAddReferenceClick, onMoveToFolder
}) => {
    
    const isEditing = editingState?.id === prompt.id;
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);

    // Version History State
    const [historyVisible, setHistoryVisible] = useState(false);
    const [viewingHistoryItem, setViewingHistoryItem] = useState<CustomPromptHistory | null>(null);
    const historyButtonRef = useRef<HTMLButtonElement>(null);
    const historyDropdownRef = useRef<HTMLDivElement>(null);

    // Close history popover if clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (historyVisible && 
                historyButtonRef.current && !historyButtonRef.current.contains(event.target as Node) &&
                historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)
            ) {
                setHistoryVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [historyVisible]);

    // Reset viewing state when the core prompt changes
    useEffect(() => {
        setViewingHistoryItem(null);
        setHistoryVisible(false);
    }, [prompt.id]);
    
    const isCustom = prompt.createdAt > 0;
    const history = prompt.history || [];
    const canShowHistory = isCustom && history.length > 0;

    const displayedData = viewingHistoryItem ? {
        ...prompt,
        ...viewingHistoryItem,
    } : prompt;

    const { text: promptText, aspectRatio, referenceAssetIds } = displayedData;
    const hasReferences = referenceAssetIds && referenceAssetIds.length > 0;

    const versionFilteredAssets = useMemo(() => {
        return assets.filter(asset => asset.promptId === prompt.id);
    }, [assets, prompt.id]);

    useEffect(() => {
        // Reset to latest image when assets change
        if (versionFilteredAssets.length > 0) {
            setPreviewIndex(versionFilteredAssets.length - 1);
        }
    }, [versionFilteredAssets]);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviewIndex(p => (p - 1 + versionFilteredAssets.length) % versionFilteredAssets.length);
    };
    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviewIndex(p => (p + 1) % versionFilteredAssets.length);
    };

    const handleViewVersion = (histItem: CustomPromptHistory | null) => {
        setViewingHistoryItem(histItem);
        setHistoryVisible(false);
    };

    return (
       <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col group/card transition-all duration-300 hover:border-blue-500/50 relative min-h-[16rem]">
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
            `}</style>
            <div className="p-4 flex-1 flex flex-col">
                <div className="relative flex-1">
                    <div className="absolute top-0 right-0 flex flex-col items-end gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                        <Tooltip text="Copy prompt"><button onClick={() => onCopy(promptText)} className="p-1.5 text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-600/60 rounded-md"><Icon path={ICONS.COPY} className="w-4 h-4"/></button></Tooltip>
                        {!isEditing && isCustom && onMoveToFolder && <Tooltip text="Move to folder"><button onClick={() => onMoveToFolder(prompt.id)} className="p-1.5 text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-600/60 rounded-md"><Icon path={ICONS.FOLDER} className="w-4 h-4"/></button></Tooltip>}
                        {!isEditing && isCustom && <Tooltip text="Edit"><button onClick={() => onStartEdit(displayedData as CustomPrompt)} className="p-1.5 text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-600/60 rounded-md"><Icon path={ICONS.EDIT} className="w-4 h-4"/></button></Tooltip>}
                        {!isEditing && isCustom && !viewingHistoryItem && <Tooltip text="Delete"><button onClick={() => onDelete(prompt.id)} className="p-1.5 text-red-400 hover:text-red-300 bg-slate-700/60 hover:bg-slate-600/60 rounded-md"><Icon path={ICONS.TRASH} className="w-4 h-4"/></button></Tooltip>}
                        {isEditing && (
                            <>
                                <Tooltip text="Save"><button onClick={() => onSaveEdit(editingState!)} className="p-1.5 text-green-400 hover:text-green-300 bg-slate-700/60 hover:bg-slate-600/60 rounded-md"><Icon path={ICONS.CHECK} className="w-4 h-4"/></button></Tooltip>
                                <Tooltip text="Cancel"><button onClick={onCancelEdit} className="p-1.5 text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-600/60 rounded-md"><Icon path={ICONS.CLOSE} className="w-4 h-4"/></button></Tooltip>
                            </>
                        )}
                    </div>
                    <div className="transition-all duration-300 group-hover/card:pr-10 mb-4">
                    {isEditing ? (
                        <div className="space-y-2">
                           <div>
                                <label className="text-xs font-bold text-slate-400">PROMPT NAME</label>
                                <input 
                                    type="text" 
                                    value={editingState.name} 
                                    onChange={e => onUpdateEditingPrompt({ ...editingState, name: e.target.value })}
                                    className="w-full bg-slate-900/60 text-white rounded-md border border-slate-700 p-1 text-sm mt-1"
                                    autoFocus
                                />
                            </div>
                             <div>
                                <label className="text-xs font-bold text-slate-400">TAGS (comma separated)</label>
                                <input 
                                    type="text" 
                                    value={editingState.tags.join(', ')} 
                                    onChange={e => onUpdateEditingPrompt({ ...editingState, tags: e.target.value.split(',').map(t => t.trim()) })}
                                    className="w-full bg-slate-900/60 text-white rounded-md border border-slate-700 p-1 text-sm mt-1"
                                />
                            </div>
                             <div>
                                <label className="text-xs font-bold text-slate-400">PROMPT TEXT</label>
                                <textarea
                                    value={editingState.text}
                                    onChange={e => onUpdateEditingPrompt({ ...editingState, text: e.target.value })}
                                    rows={4}
                                    className="w-full bg-slate-900/60 text-white rounded-md border border-slate-700 p-2 text-sm mt-1 custom-scroll"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div 
                                className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/30 -mx-2 px-2 py-1 rounded-md transition-colors"
                                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                            >
                                <Icon 
                                    path={ICONS.CHEVRON_DOWN} 
                                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isDetailsExpanded ? 'rotate-0' : '-rotate-90'}`}
                                />
                                <h3 className="font-bold text-white break-words flex-1" title={prompt.name}>{prompt.name}</h3>
                                <div className="relative">
                                    <button
                                        ref={historyButtonRef}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            canShowHistory && setHistoryVisible(v => !v);
                                        }}
                                        disabled={!canShowHistory}
                                        className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full flex-shrink-0 disabled:cursor-default disabled:opacity-70 hover:bg-slate-600 transition"
                                        title={canShowHistory ? "View version history" : "Version"}
                                    >
                                        v{displayedData.version}
                                    </button>
                                    {historyVisible && (
                                        <div ref={historyDropdownRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 w-56 text-left">
                                            <ul className="text-sm p-1">
                                                <li onClick={() => handleViewVersion(null)} className={`p-2 rounded-md cursor-pointer hover:bg-slate-700 ${!viewingHistoryItem ? 'bg-cyan-800' : ''}`}>
                                                    <div className="font-bold text-white">Latest: v{prompt.version}</div>
                                                    <div className="text-xs text-slate-400">{new Date(prompt.createdAt).toLocaleDateString()}</div>
                                                </li>
                                                {history.map((histItem, index) => (
                                                    <li key={index} onClick={() => handleViewVersion(histItem)} className={`p-2 rounded-md cursor-pointer hover:bg-slate-700 ${viewingHistoryItem?.version === histItem.version ? 'bg-cyan-800' : ''}`}>
                                                        <div className="font-bold text-white">v{histItem.version}</div>
                                                        <div className="text-xs text-slate-400">{new Date(histItem.createdAt).toLocaleDateString()}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {isDetailsExpanded && (
                                <div className="overflow-hidden transition-all duration-300 ease-in-out">
                                    {displayedData.tags && displayedData.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {displayedData.tags.map(tag => tag && <span key={tag} className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded-full">{tag}</span>)}
                                        </div>
                                    )}
                                    <div className="text-slate-300 text-sm leading-relaxed p-2 bg-slate-900/40 rounded-md max-h-24 overflow-y-auto custom-scroll border border-slate-700/50 transition-all duration-300">
                                        {promptText.split(/(\[subject\])/).map((part, i) => part === '[subject]' ? <span key={i} className="text-cyan-400 font-bold bg-slate-700/80 px-1.5 py-0.5 rounded">{subjectDescription || '[subject]'}</span> : part)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </div>

                <div className="mb-4 flex-grow flex flex-col justify-center">
                    {isLoading ? (
                        <div className="relative bg-slate-900/60 border-2 border-dashed border-cyan-500/50 rounded-lg overflow-hidden h-48">
                            {/* Background animated gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 animate-pulse"></div>
                            
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-shimmer"></div>
                            
                            {/* Content */}
                            <div className="relative flex flex-col items-center justify-center h-full p-4">
                                {/* Spinner */}
                                <div className="relative mb-3">
                                    <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-blue-400 rounded-full animate-spin-slow"></div>
                                </div>
                                
                                {/* Text */}
                                <p className="text-cyan-400 font-semibold text-xs mb-3 animate-pulse">Generating...</p>
                                
                                {/* Stop button */}
                                <button 
                                    onClick={() => onStop(prompt.id)} 
                                    className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-500 text-white font-bold py-1.5 px-3 rounded-md transition-all hover:scale-105 active:scale-95 shadow-lg text-sm"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="6" y="6" width="12" height="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Stop
                                </button>
                            </div>
                        </div>
                    ) : versionFilteredAssets.length > 0 ? (
                        <div>
                            {showPreviews ? (
                                <div className="flex space-x-2 overflow-x-auto pb-2 custom-scroll">
                                    {versionFilteredAssets.map((asset, assetIndex) => (
                                        <div key={asset.id} className="relative group/img flex-shrink-0" onClick={() => onPreviewClick(asset)}>
                                            <img src={asset.imageUrl} alt={`Preview ${assetIndex}`} className="w-24 h-24 object-cover rounded-md cursor-pointer bg-slate-900/40"/>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="relative group/img" onClick={() => onPreviewClick(versionFilteredAssets[previewIndex])}>
                                    <img src={versionFilteredAssets[previewIndex]?.imageUrl} alt="Latest preview" className="w-full max-h-48 object-contain rounded-lg cursor-pointer bg-slate-900/40"/>
                                    {versionFilteredAssets.length > 1 && (
                                        <>
                                            <button onClick={handlePrev} className="absolute left-1 top-1/2 -translate-y-1/2 bg-slate-800/50 hover:bg-slate-700/80 p-1 rounded-full text-white opacity-0 group-hover/img:opacity-100 transition-opacity"><Icon path={ICONS.CHEVRON_LEFT} className="w-5 h-5"/></button>
                                            <button onClick={handleNext} className="absolute right-1 top-1/2 -translate-y-1/2 bg-slate-800/50 hover:bg-slate-700/80 p-1 rounded-full text-white opacity-0 group-hover/img:opacity-100 transition-opacity"><Icon path={ICONS.CHEVRON_RIGHT} className="w-5 h-5"/></button>
                                            <div className="absolute bottom-1 right-1 bg-slate-900/70 text-white text-xs px-1.5 py-0.5 rounded">{previewIndex + 1} / {versionFilteredAssets.length}</div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            
                <div className="mt-auto flex items-center gap-2 flex-wrap">
                    <Tooltip text="Generate image" position="top">
                        <button onClick={() => onGenerate(promptText, prompt.id)} disabled={isLoading || isEditing} className={`flex-1 h-9 flex items-center justify-center gap-2 text-sm text-white font-bold px-3 rounded-md transition disabled:bg-slate-600 disabled:cursor-wait ${isPromptSelected && isBatchMode ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400'}`}>
                           <Icon path={ICONS.SPARKLES} className="w-5 h-5"/>
                           <span className="pl-1">Generate</span>
                        </button>
                    </Tooltip>
                    
                    <Tooltip text="Aspect Ratio" position="top">
                        <select value={aspectRatio || "1:1"} onChange={e => onSetAspectRatio(prompt.id, e.target.value)} disabled={isEditing || !!viewingHistoryItem} className={`h-9 text-sm font-semibold rounded-md transition text-white px-2 appearance-none text-center ${isPromptSelected && isBatchMode ? 'bg-orange-700 border-orange-600' : 'bg-slate-600 border-slate-500 hover:bg-slate-500'} disabled:opacity-50`}>
                            {ASPECT_RATIOS.map(r => <option key={r} value={r} className="bg-slate-800">{r}</option>)}
                        </select>
                    </Tooltip>

                    <Tooltip text="Add/View References" position="top">
                        <button onClick={() => onAddReferenceClick(prompt.id)} disabled={isEditing || !!viewingHistoryItem} className={`h-9 w-9 flex items-center justify-center rounded-md transition relative ${isPromptSelected && isBatchMode ? 'bg-orange-700 border-orange-600' : 'bg-slate-600 border-slate-500 hover:bg-slate-500'} ${hasReferences ? 'ring-2 ring-cyan-400' : ''} disabled:opacity-50`}>
                           <Icon path={ICONS.ADD_REFERENCE} className="w-5 h-5"/>
                           {hasReferences && <span className="absolute -top-1 -right-1 bg-cyan-400 text-slate-900 text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">{referenceAssetIds.length}</span>}
                        </button>
                    </Tooltip>

                    {isBatchMode && 
                         <Tooltip text="Select for batch generation" position="top">
                            <label className={`flex items-center justify-center h-9 w-9 rounded-md border cursor-pointer transition ${isPromptSelected ? 'bg-orange-600 border-orange-500' : 'bg-slate-600 hover:bg-slate-500 border-slate-500'} ${!!viewingHistoryItem ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <input type="checkbox" checked={isPromptSelected} onClick={(e) => onSelectPrompt(prompt.id, e)} onChange={() => {}} disabled={!!viewingHistoryItem} className="h-4 w-4 rounded text-orange-500 bg-transparent border-slate-400 focus:ring-orange-500 focus:ring-offset-0 ring-offset-transparent disabled:cursor-not-allowed"/>
                            </label>
                        </Tooltip>
                    }
                </div>
            </div>
        </div>
    );
};
