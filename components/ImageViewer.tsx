import React, { useState, useEffect, useCallback } from 'react';
import type { GeneratedAsset, ReferenceImage } from '../types';
import { Icon } from './Icon';
import { ICONS } from '../constants';
import { Tooltip } from './Tooltip';

interface ImageViewerProps {
    isOpen: boolean;
    asset: GeneratedAsset | ReferenceImage | null;
    allAssets: (GeneratedAsset | ReferenceImage)[];
    onClose: () => void;
    onUpdateAsset: (asset: GeneratedAsset | ReferenceImage) => void;
    onDeleteAsset: (assetId: string) => void;
    onMagicEdit: (asset: GeneratedAsset | ReferenceImage) => void;
    onSelectAsset: (assetId: string, isSelected: boolean) => void;
    isSelected: boolean;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ isOpen, asset, allAssets, onClose, onUpdateAsset, onDeleteAsset, onMagicEdit, onSelectAsset, isSelected }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentAsset, setCurrentAsset] = useState<GeneratedAsset | ReferenceImage | null>(asset);
    const [isEditingName, setIsEditingName] = useState(false);
    const [name, setName] = useState("");

    useEffect(() => {
        if (asset && allAssets.length > 0) {
            const index = allAssets.findIndex(a => a.id === asset.id);
            if(index > -1) {
                setCurrentIndex(index);
                setCurrentAsset(allAssets[index]);
                setName(allAssets[index].name);
            }
        }
    }, [asset, allAssets, isOpen]);
    
    const handleClose = (e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        setIsEditingName(false);
        onClose();
    };

    const handleNext = useCallback((e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        if(allAssets.length > 0) {
            const nextIndex = (currentIndex + 1) % allAssets.length;
            setCurrentIndex(nextIndex);
            setCurrentAsset(allAssets[nextIndex]);
            setName(allAssets[nextIndex].name);
        }
    }, [allAssets, currentIndex]);
    
    const handlePrev = useCallback((e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        if(allAssets.length > 0) {
            const prevIndex = (currentIndex - 1 + allAssets.length) % allAssets.length;
            setCurrentIndex(prevIndex);
            setCurrentAsset(allAssets[prevIndex]);
            setName(allAssets[prevIndex].name);
        }
    }, [allAssets, currentIndex]);
    
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleNext, handlePrev, handleClose]);

    const handleNameSave = () => {
        if (currentAsset && name.trim()) {
            onUpdateAsset({ ...currentAsset, name: name.trim() });
        }
        setIsEditingName(false);
    };

    if (!isOpen || !currentAsset) return null;

    const isGenerated = 'imageUrl' in currentAsset;
    const imageUrl = isGenerated ? currentAsset.imageUrl : currentAsset.previewUrl;

    return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center p-4 z-[60]" onClick={handleClose}>
            <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white text-4xl leading-none z-20">&times;</button>
            {allAssets.length > 1 && <button onClick={handlePrev} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white z-20"><Icon path={ICONS.CHEVRON_LEFT} className="w-8 h-8"/></button>}
            {allAssets.length > 1 && <button onClick={handleNext} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white z-20"><Icon path={ICONS.CHEVRON_RIGHT} className="w-8 h-8"/></button>}
            
            <main className="flex-1 flex w-full h-full items-center justify-center relative min-h-0" onClick={e => e.stopPropagation()}>
    <div className="relative group/viewer">
        <img src={imageUrl} alt={currentAsset.name} className="max-w-full max-h-full object-contain rounded-lg"/>
        <div className="absolute top-2 right-2 flex flex-col items-center gap-2 opacity-0 group-hover/viewer:opacity-100 transition-opacity duration-300 bg-slate-900/80 backdrop-blur-sm p-2 rounded-lg border border-slate-700">
            {isGenerated && <Tooltip text={isSelected ? 'Deselect' : 'Select'}><button onClick={() => onSelectAsset(currentAsset.id, !isSelected)} className={`p-2 rounded-md transition ${isSelected ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-800 hover:bg-slate-700'}`}><Icon path={ICONS.CHECK} className="w-5 h-5"/></button></Tooltip>}
            <Tooltip text="Magic Edit"><button onClick={() => onMagicEdit(currentAsset)} className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition text-cyan-400"><Icon path={ICONS.SPARKLES} className="w-5 h-5"/></button></Tooltip>
            <Tooltip text="Delete"><button onClick={() => onDeleteAsset(currentAsset.id)} className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition text-red-400"><Icon path={ICONS.TRASH} className="w-5 h-5"/></button></Tooltip>
        </div>
    </div>
</main>
            
            <footer className="w-full max-w-5xl flex-shrink-0 text-left p-4" onClick={e => e.stopPropagation()}>
                 <div className="space-y-2 text-sm max-w-3xl">
                    {isEditingName ? (
                        <input type="text" value={name} onChange={e => setName(e.target.value)} onBlur={handleNameSave} onKeyDown={e => e.key === 'Enter' && handleNameSave()} autoFocus className="bg-slate-900 text-lg font-bold w-auto max-w-full p-1 rounded border border-cyan-500 text-left" />
                    ) : (
                        <h2 className="text-lg font-bold text-white break-words cursor-pointer" onDoubleClick={() => setIsEditingName(true)}>{currentAsset.name}</h2>
                    )}
                    {isGenerated && (
                        <>
                            <p className="text-slate-200 text-base break-words max-w-prose">{currentAsset.prompt}</p>
                            <p className="text-slate-400 text-xs"><strong className="text-slate-300">Date:</strong> {new Date(currentAsset.createdAt).toLocaleString()} | <strong className="text-slate-300">Ratio:</strong> {currentAsset.aspectRatio} | <strong className="text-slate-300">Resolution:</strong> {currentAsset.resolution ? `${currentAsset.resolution.width}x${currentAsset.resolution.height}` : 'N/A'}</p>
                        </>
                    )}
                </div>
            </footer>
        </div>
    )
};