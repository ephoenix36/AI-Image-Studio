
import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icon';
import { ICONS } from '../constants';
import { LoadingAnimation } from './LoadingAnimation';
import { magicEditImage, extendImage, upscaleImage } from '../services/geminiService';
import { GeneratedAsset, ReferenceAsset } from '../types';
import { blobToBase64 } from '../utils';

type BatchEditMode = 'prompt' | 'resolution' | 'crop' | 'upscale';
type ResizeMode = 'fit' | 'stretch' | 'crop';

interface BatchEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: GeneratedAsset[];
    onSave: (edits: { originalAsset: GeneratedAsset, newDataUrl: string, name?: string }[]) => void;
    addNotification: (message: string, type?: 'info' | 'error') => void;
    devMode: boolean;
}

export const BatchEditorModal: React.FC<BatchEditorModalProps> = ({ isOpen, onClose, assets, onSave, addNotification, devMode }) => {
    const [editMode, setEditMode] = useState<BatchEditMode>('prompt');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    // Prompt mode state
    const [editPrompt, setEditPrompt] = useState("");
    const [instructionAssets, setInstructionAssets] = useState<ReferenceAsset[]>([]);

    // Resolution mode state
    const [newResolution, setNewResolution] = useState({ w: 1024, h: 1024 });
    const [resizeMode, setResizeMode] = useState<ResizeMode>('fit');

    // Crop mode state
    const [cropAspectRatio, setCropAspectRatio] = useState("1:1");

    useEffect(() => {
        if (isOpen) {
            setEditMode('prompt');
            setIsGenerating(false);
            setProgress({ current: 0, total: 0 });
            setEditPrompt("");
            setInstructionAssets([]);
        }
    }, [isOpen]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        try {
            const newAssets: ReferenceAsset[] = await Promise.all(files.map(async (file: File): Promise<ReferenceAsset | null> => {
                if(file.type.startsWith('image/')) return { id: crypto.randomUUID(), type: 'image', name: file.name, previewUrl: URL.createObjectURL(file), base64: '', mimeType: file.type, folderId: null, createdAt: Date.now() };
                if(file.type.startsWith('text/')) return { id: crypto.randomUUID(), type: 'document', name: file.name, content: await file.text(), mimeType: file.type, folderId: null, createdAt: Date.now() };
                addNotification(`Unsupported file type: ${file.name}`, 'error');
                return null;
            }));
            setInstructionAssets(prev => [...prev, ...newAssets.filter(Boolean) as ReferenceAsset[]]);
        } catch (error) {
            addNotification("An error occurred while processing assets.", 'error');
        }
    };

    const handleApplyEdits = async () => {
        setIsGenerating(true);
        setProgress({ current: 0, total: assets.length });

        const editedAssets: { originalAsset: GeneratedAsset, newDataUrl: string, name?: string }[] = [];

        for (const [index, asset] of assets.entries()) {
            setProgress({ current: index + 1, total: assets.length });
            try {
                let resultUrl: string | undefined;
                let resultName: string | undefined;

                if (editMode === 'prompt') {
                    if (!editPrompt.trim()) { addNotification('Please enter an edit instruction.', 'error'); break; }
                     if (devMode) {
                        resultUrl = asset.imageUrl;
                        resultName = `${asset.name}_prompted(sim)`;
                    } else {
                        const response = await fetch(asset.imageUrl);
                        const blob = await response.blob();
                        const instructionAssetPayloads = await Promise.all(instructionAssets.map(async a => {
                            if(a.type === 'image') return { base64: await blobToBase64(await (await fetch(a.previewUrl)).blob()), mimeType: a.mimeType };
                            return { base64: btoa(a.content), mimeType: a.mimeType };
                        }));
                        const result = await magicEditImage(await blobToBase64(blob), blob.type, editPrompt, instructionAssetPayloads);
                        resultUrl = result.imageUrl;
                        resultName = `${asset.name}_prompted`;
                        if (result.error) throw new Error(result.error);
                    }
                } else if (editMode === 'resolution') {
                    resultUrl = await processImageWithCanvas(asset.imageUrl, canvas => {
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const img = new Image();
                        img.src = asset.imageUrl;
                        canvas.width = newResolution.w; canvas.height = newResolution.h;
                        let dx = 0, dy = 0, dw = newResolution.w, dh = newResolution.h;
                        if(resizeMode === 'fit' || resizeMode === 'crop'){
                            const imgRatio = img.naturalWidth / img.naturalHeight; const canvasRatio = newResolution.w / newResolution.h;
                            if((resizeMode === 'fit' && imgRatio > canvasRatio) || (resizeMode === 'crop' && imgRatio < canvasRatio)){
                                dw = newResolution.w; dh = dw / imgRatio; dy = (newResolution.h - dh) / 2;
                            } else {
                                dh = newResolution.h; dw = dh * imgRatio; dx = (newResolution.w - dw) / 2;
                            }
                        }
                        ctx.drawImage(img, dx, dy, dw, dh);
                    });
                    resultName = `${asset.name}_resized`;
                } else if (editMode === 'crop') {
                    resultUrl = await processImageWithCanvas(asset.imageUrl, canvas => {
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const img = new Image();
                        img.src = asset.imageUrl;
                        const [targetW, targetH] = cropAspectRatio.split(':').map(Number);
                        const targetRatio = targetW / targetH;
                        const imgRatio = img.naturalWidth / img.naturalHeight;
                        let sx=0, sy=0, sw=img.naturalWidth, sh=img.naturalHeight;
                        if(imgRatio > targetRatio) { // wider than target, crop sides
                            sw = sh * targetRatio;
                            sx = (img.naturalWidth - sw) / 2;
                        } else { // taller than target, crop top/bottom
                            sh = sw / targetRatio;
                            sy = (img.naturalHeight - sh) / 2;
                        }
                        canvas.width = sw; canvas.height = sh;
                        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                    });
                    resultName = `${asset.name}_cropped`;
                } else if (editMode === 'upscale') {
                     if (devMode) {
                        resultUrl = asset.imageUrl;
                        resultName = `${asset.name}_upscaled(sim)`;
                    } else {
                        const response = await fetch(asset.imageUrl);
                        const blob = await response.blob();
                        const result = await upscaleImage(await blobToBase64(blob), blob.type);
                        resultUrl = result.imageUrl;
                        resultName = `${asset.name}_upscaled`;
                        if (result.error) throw new Error(result.error);
                    }
                }

                if (resultUrl) {
                    editedAssets.push({ originalAsset: asset, newDataUrl: resultUrl, name: resultName });
                }
            } catch (e: any) {
                addNotification(`Failed to edit ${asset.name}: ${e.message}`, 'error');
            }
        }
        
        onSave(editedAssets);
    };
    
    const processImageWithCanvas = (imageUrl: string, operation: (canvas: HTMLCanvasElement) => void): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if(!ctx) return reject(new Error("Could not get canvas context"));
                ctx.drawImage(img, 0, 0);
                operation(canvas);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => reject(new Error('Failed to load image for processing.'));
            img.src = imageUrl;
        });
    }

    if (!isOpen) return null;

    const ModeButton: React.FC<{ mode: BatchEditMode, label: string, icon: string }> = ({ mode, label, icon }) => (
        <button onClick={() => setEditMode(mode)} className={`flex-1 p-3 rounded-md transition text-sm font-semibold flex flex-col items-center gap-1 ${editMode === mode ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
            <Icon path={icon} className="w-5 h-5" />
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col relative">
                {isGenerating && <LoadingAnimation><span className="absolute bottom-1/4 text-white text-sm">Processing {progress.current} of {progress.total}...</span></LoadingAnimation>}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Icon path={ICONS.EDIT}/> Batch Edit ({assets.length} images)</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto custom-scroll">
                    <div className="flex gap-2">
                        <ModeButton mode="prompt" label="AI Edit" icon={ICONS.SPARKLES} />
                        <ModeButton mode="resolution" label="Resolution" icon={ICONS.IMAGE_COPY} />
                        <ModeButton mode="crop" label="Crop" icon={ICONS.CROP} />
                        <ModeButton mode="upscale" label="Upscale" icon={ICONS.ADD_REFERENCE} />
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg space-y-3">
                        {editMode === 'prompt' && <>
                            <label className="font-semibold text-white block">Edit Instructions</label>
                            <textarea rows={3} value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g., make the background a sandy beach" className="w-full bg-slate-700 p-2 rounded text-sm custom-scroll" />
                            <label className="font-semibold text-white block">Instructional Assets</label>
                             <div className="p-2 border-2 border-dashed rounded-lg border-slate-600 hover:border-slate-500 text-center">
                                <label htmlFor="batch-asset-upload" className="font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer text-sm">Click to upload assets</label>
                                <input id="batch-asset-upload" type="file" className="sr-only" onChange={handleFileSelect} multiple accept="image/*,text/plain"/>
                            </div>
                            <div className="flex gap-2 mt-2 overflow-x-auto">{instructionAssets.map(a => <div key={a.id} className="w-12 h-12 rounded bg-slate-700 flex-shrink-0 relative group/asset">
                                {a.type === 'image' ? <img src={(a as any).previewUrl} className="w-full h-full object-cover rounded" alt={a.name}/> : <div className="text-xs p-1">{a.name}</div>}
                                <button onClick={() => setInstructionAssets(ia => ia.filter(i => i.id !== a.id))} className="absolute -top-1 -right-1 bg-red-600 rounded-full w-4 h-4 text-white text-xs opacity-0 group-hover/asset:opacity-100">&times;</button>
                            </div>)}</div>
                        </>}
                        {editMode === 'resolution' && <>
                            <label className="font-semibold text-white block">New Resolution</label>
                            <div className="flex items-center gap-2">
                                <input type="number" value={newResolution.w} onChange={e=>setNewResolution(r=>({...r, w: +e.target.value}))} className="w-1/2 bg-slate-700 p-1 rounded" />
                                <span>x</span>
                                <input type="number" value={newResolution.h} onChange={e=>setNewResolution(r=>({...r, h: +e.target.value}))} className="w-1/2 bg-slate-700 p-1 rounded" />
                            </div>
                            <div className="relative">
                                <select value={resizeMode} onChange={e=>setResizeMode(e.target.value as ResizeMode)} className="w-full bg-slate-700 p-2 rounded appearance-none pr-8">
                                    <option value="fit">Fit (maintain ratio, may add space)</option>
                                    <option value="stretch">Stretch (ignore ratio)</option>
                                    <option value="crop">Crop to Fill (maintain ratio, may crop)</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-300">
                                    <Icon path={ICONS.CHEVRON_DOWN} className="w-4 h-4" />
                                </div>
                            </div>
                        </>}
                        {editMode === 'crop' && <>
                            <label className="font-semibold text-white block">Crop to Aspect Ratio</label>
                             <div className="relative">
                                <select value={cropAspectRatio} onChange={e=>setCropAspectRatio(e.target.value)} className="w-full bg-slate-700 p-2 rounded appearance-none pr-8">
                                    <option value="1:1">1:1 (Square)</option>
                                    <option value="16:9">16:9 (Widescreen)</option>
                                    <option value="9:16">9:16 (Vertical)</option>
                                    <option value="4:3">4:3 (Standard)</option>
                                    <option value="3:4">3:4 (Portrait)</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-300">
                                    <Icon path={ICONS.CHEVRON_DOWN} className="w-4 h-4" />
                                </div>
                            </div>
                             <p className="text-xs text-slate-400">Crops from the center of each image to match the selected aspect ratio.</p>
                        </>}
                        {editMode === 'upscale' && <>
                            <label className="font-semibold text-white block">4x Upscale</label>
                            <p className="text-sm text-slate-300">This will upscale all selected images to 4 times their original resolution. This operation may take a while and will consume API credits.</p>
                        </>}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700 flex-shrink-0">
                    <button onClick={handleApplyEdits} disabled={isGenerating || assets.length === 0} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-md transition disabled:bg-slate-500">
                        <Icon path={ICONS.EDIT} /> {isGenerating ? `Processing ${progress.current}/${progress.total}...` : `Apply to ${assets.length} Images`}
                    </button>
                </div>
            </div>
        </div>
    );
};