import React, { useState, useEffect, useCallback } from 'react';
import type { GeneratedAsset, ReferenceImage } from '@/types/types';
import { Icon } from '@/components/Icon';
import { ICONS } from '@/constants';
import { Tooltip } from '@/components/Tooltip';
import { useBodyScrollLock } from '@/utils/utils';

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
    useBodyScrollLock(isOpen);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentAsset, setCurrentAsset] = useState<GeneratedAsset | ReferenceImage | null>(asset);
    const [isEditingName, setIsEditingName] = useState(false);
    const [name, setName] = useState("");
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (asset && allAssets.length > 0) {
            const index = allAssets.findIndex(a => a.id === asset.id);
            if(index > -1) {
                setCurrentIndex(index);
                setCurrentAsset(allAssets[index]);
                setName(allAssets[index].name);
                setZoom(1);
                setPan({ x: 0, y: 0 });
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
            setZoom(1);
            setPan({ x: 0, y: 0 });
        }
    }, [allAssets, currentIndex]);
    
    const handlePrev = useCallback((e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        if(allAssets.length > 0) {
            const prevIndex = (currentIndex - 1 + allAssets.length) % allAssets.length;
            setCurrentIndex(prevIndex);
            setCurrentAsset(allAssets[prevIndex]);
            setName(allAssets[prevIndex].name);
            setZoom(1);
            setPan({ x: 0, y: 0 });
        }
    }, [allAssets, currentIndex]);
    
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    }, [zoom, pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
        }
    }, [isPanning, startPan]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);
    
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            if (e.key === 'ArrowRight') {
                e.stopPropagation();
                handleNext();
            }
            if (e.key === 'ArrowLeft') {
                e.stopPropagation();
                handlePrev();
            }
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, handleNext, handlePrev]);

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
            {allAssets.length > 1 && <button onClick={handleNext} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white z-20"><Icon path={ICONS.CHEVRON_LEFT} className="w-8 h-8"/></button>}
            {allAssets.length > 1 && <button onClick={handlePrev} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white z-20"><Icon path={ICONS.CHEVRON_RIGHT} className="w-8 h-8"/></button>}
            
            <main className="flex-1 flex w-full h-full items-center justify-center relative min-h-0" onClick={e => e.stopPropagation()}>
    <div 
        className="relative group/viewer overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
    >
        <img 
            src={imageUrl} 
            alt={currentAsset.name} 
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
            draggable={false}
        />
        <div className="absolute top-2 left-2 flex flex-col items-stretch gap-1 opacity-0 group-hover/viewer:opacity-100 transition-opacity duration-300 bg-slate-900/80 backdrop-blur-sm p-2 rounded-lg border border-slate-700 min-w-[80px]">
            <Tooltip text="Zoom In"><button onClick={() => setZoom(prev => Math.min(5, prev + 0.25))} className="w-full p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition"><span className="text-lg font-bold">+</span></button></Tooltip>
            <div className="text-center text-xs text-slate-400">{Math.round(zoom * 100)}%</div>
            <Tooltip text="Zoom Out"><button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))} className="w-full p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition"><span className="text-lg font-bold">−</span></button></Tooltip>
            <Tooltip text="Reset Zoom"><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-full p-1 rounded-md bg-slate-800 hover:bg-slate-700 transition text-xs">Reset</button></Tooltip>
        </div>
        <div className="absolute top-2 right-2 flex flex-col items-stretch gap-2 opacity-0 group-hover/viewer:opacity-100 transition-opacity duration-300 bg-slate-900/80 backdrop-blur-sm p-2 rounded-lg border border-slate-700 min-w-[80px]">
            {isGenerated && <Tooltip text={isSelected ? 'Deselect' : 'Select'}><button onClick={() => onSelectAsset(currentAsset.id, !isSelected)} className={`w-full p-2 rounded-md transition ${isSelected ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-800 hover:bg-slate-700'}`}><Icon path={ICONS.CHECK} className="w-5 h-5 mx-auto"/></button></Tooltip>}
            <Tooltip text="Magic Edit"><button onClick={() => onMagicEdit(currentAsset)} className="w-full p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition text-cyan-400"><Icon path={ICONS.SPARKLES} className="w-5 h-5 mx-auto"/></button></Tooltip>
            <Tooltip text="Delete"><button onClick={() => onDeleteAsset(currentAsset.id)} className="w-full p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition text-red-400"><Icon path={ICONS.TRASH} className="w-5 h-5 mx-auto"/></button></Tooltip>
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
