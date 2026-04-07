import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    const stageRef = useRef<HTMLDivElement>(null);

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
        const stage = stageRef.current;
        if (!stage) return;

        const rect = stage.getBoundingClientRect();
        const cursorX = e.clientX - (rect.left + rect.width / 2);
        const cursorY = e.clientY - (rect.top + rect.height / 2);
        const delta = e.deltaY > 0 ? -0.1 : 0.1;

        setZoom((previousZoom) => {
            const nextZoom = Math.max(0.5, Math.min(5, +(previousZoom + delta).toFixed(2)));
            if (nextZoom === previousZoom) return previousZoom;

            setPan((previousPan) => ({
                x: cursorX - ((cursorX - previousPan.x) / previousZoom) * nextZoom,
                y: cursorY - ((cursorY - previousPan.y) / previousZoom) * nextZoom,
            }));

            return nextZoom;
        });
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
         <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex flex-col z-[60]" onClick={handleClose}>
            <button onClick={handleClose} className="absolute top-3 right-4 p-2 text-slate-400 hover:text-white text-3xl leading-none z-20">&times;</button>
            {allAssets.length > 1 && <button onClick={handlePrev} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white z-20"><Icon path={ICONS.CHEVRON_LEFT} className="w-8 h-8"/></button>}
            {allAssets.length > 1 && <button onClick={handleNext} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white z-20"><Icon path={ICONS.CHEVRON_RIGHT} className="w-8 h-8"/></button>}
            
            <main className="flex-1 flex w-full items-center justify-center relative min-h-0 overflow-hidden group/viewer p-10 pt-12" onClick={e => e.stopPropagation()}>
                <div 
                    ref={stageRef}
                    className="relative overflow-hidden max-w-full max-h-full flex items-center justify-center"
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
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                        }}
                        draggable={false}
                    />
                </div>
                {/* Zoom controls — positioned within main so always in viewport */}
                <div className="absolute top-20 left-4 flex flex-col items-stretch gap-1 opacity-0 group-hover/viewer:opacity-100 transition-opacity duration-300 bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-lg border border-slate-700 z-10">
                    <Tooltip text="Zoom In"><button onClick={() => setZoom((previousZoom) => Math.min(5, +(previousZoom + 0.25).toFixed(2)))} className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 transition"><span className="text-sm font-bold">+</span></button></Tooltip>
                    <div className="text-center text-xs text-slate-400 py-0.5">{Math.round(zoom * 100)}%</div>
                    <Tooltip text="Zoom Out"><button onClick={() => setZoom((previousZoom) => Math.max(0.5, +(previousZoom - 0.25).toFixed(2)))} className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 transition"><span className="text-sm font-bold">−</span></button></Tooltip>
                    <Tooltip text="Reset Zoom"><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 transition text-xs">↺</button></Tooltip>
                </div>
                {/* Action controls — positioned within main */}
                <div className="absolute top-20 right-4 flex flex-col items-stretch gap-1.5 opacity-0 group-hover/viewer:opacity-100 transition-opacity duration-300 bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-lg border border-slate-700 z-10">
                    {isGenerated && <Tooltip text={isSelected ? 'Deselect' : 'Select'}><button onClick={() => onSelectAsset(currentAsset.id, !isSelected)} className={`w-8 h-8 flex items-center justify-center rounded-md transition ${isSelected ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-800 hover:bg-slate-700'}`}><Icon path={ICONS.CHECK} className="w-4 h-4"/></button></Tooltip>}
                    <Tooltip text="Magic Edit"><button onClick={() => onMagicEdit(currentAsset)} className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 transition text-cyan-400"><Icon path={ICONS.SPARKLES} className="w-4 h-4"/></button></Tooltip>
                    <Tooltip text="Delete"><button onClick={() => onDeleteAsset(currentAsset.id)} className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 transition text-red-400"><Icon path={ICONS.TRASH} className="w-4 h-4"/></button></Tooltip>
                </div>
            </main>
            
            <footer className="w-full flex-shrink-0 text-left px-6 py-3 max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                 <div className="space-y-1.5 text-sm max-w-4xl">
                    {isEditingName ? (
                        <input type="text" value={name} onChange={e => setName(e.target.value)} onBlur={handleNameSave} onKeyDown={e => e.key === 'Enter' && handleNameSave()} autoFocus className="bg-slate-900 text-lg font-bold w-auto max-w-full p-1 rounded border border-cyan-500 text-left" />
                    ) : (
                        <h2 className="text-base font-bold text-white break-words cursor-pointer leading-tight" onDoubleClick={() => setIsEditingName(true)}>{currentAsset.name}</h2>
                    )}
                    {isGenerated && (
                        <>
                            <p className="text-slate-300 text-sm break-words max-w-prose leading-relaxed">{currentAsset.prompt}</p>
                            <p className="text-slate-400 text-xs">
                                <strong className="text-slate-300">Date:</strong> {new Date(currentAsset.createdAt).toLocaleString()}
                                {currentAsset.aspectRatio && <> | <strong className="text-slate-300">Ratio:</strong> {currentAsset.aspectRatio}</>}
                                {currentAsset.resolution && <> | <strong className="text-slate-300">Resolution:</strong> {currentAsset.resolution.width}x{currentAsset.resolution.height}</>}
                            </p>
                        </>
                    )}
                </div>
            </footer>
        </div>
    )
};
