// Fix: Import useMemo from React.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icon } from './Icon';
import { ICONS } from '../constants';
import { LoadingAnimation } from './LoadingAnimation';
import { magicEditImage, detectObjectsInImage, extendImage, upscaleImage } from '../services/geminiService';
import { GeneratedAsset, ReferenceAsset, ReferenceImage } from '../types';
import { blobToBase64 } from '../utils';
import { Tooltip } from './Tooltip';

interface ImageEditorModalProps {
    isOpen: boolean;
    asset: GeneratedAsset | ReferenceImage | null;
    allAssets: GeneratedAsset[];
    onClose: () => void;
    onSave: (originalAsset: GeneratedAsset | ReferenceImage, newDataUrl: string, name?: string) => void;
    addNotification: (message: string, type?: 'info' | 'error') => void;
    devMode: boolean;
}

type DrawMode = 'pen' | 'rect' | 'oval';
type AdvancedTool = 'none' | 'resolution' | 'crop' | 'detect';
type ResizeMode = 'fit' | 'stretch' | 'crop';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, asset, allAssets, onClose, onSave, addNotification, devMode }) => {
    const [editPrompt, setEditPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentAsset, setCurrentAsset] = useState<GeneratedAsset | ReferenceImage | null>(asset);
    const [history, setHistory] = useState<(GeneratedAsset | ReferenceImage)[]>([]);
    const [imageUrl, setImageUrl] = useState("");
    
    const [isEditingName, setIsEditingName] = useState(false);
    const [editableName, setEditableName] = useState("");

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState({x: 0, y: 0});
    
    const [drawMode, setDrawMode] = useState<DrawMode>('pen');
    const [drawColor, setDrawColor] = useState('#00FFFF');
    const [drawSize, setDrawSize] = useState(5);

    const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [instructionAssets, setInstructionAssets] = useState<ReferenceAsset[]>([]);

    const [activeTool, setActiveTool] = useState<AdvancedTool>('none');
    
    // Resolution tool state
    const [newResolution, setNewResolution] = useState({ w: 0, h: 0});
    const [resizeMode, setResizeMode] = useState<ResizeMode>('fit');
    
    // Crop tool state
    const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
    
    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const clearedState = ctx.getImageData(0, 0, canvas.width, canvas.height);
                setCanvasHistory([clearedState]);
                setHistoryIndex(0);
            }
        }
    }, []);

    const clearOverlay = () => {
        const canvas = overlayCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const updateCanvasAndImage = useCallback((newImageUrl: string) => {
        setImageUrl(newImageUrl);
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            const overlay = overlayCanvasRef.current;
            if (canvas && overlay) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                overlay.width = img.naturalWidth;
                overlay.height = img.naturalHeight;
                clearCanvas();
                clearOverlay();
            }
        };
        img.src = newImageUrl;
    }, [clearCanvas]);

    const resetState = useCallback(() => {
        if (asset) {
            setCurrentAsset(asset);
            setEditableName(asset.name);
            const initialUrl = 'imageUrl' in asset ? asset.imageUrl : asset.previewUrl;
            updateCanvasAndImage(initialUrl);
            
            const lineage: (GeneratedAsset | ReferenceImage)[] = [asset];
            if ('editedFromId' in asset) {
                let current = asset;
                while(current.editedFromId) {
                    const parent = allAssets.find(a => a.id === current.editedFromId);
                    if(parent) { lineage.unshift(parent); current = parent; } 
                    else { break; }
                }
            }
            setHistory(lineage);
        } else {
            setCurrentAsset(null);
            setHistory([]);
            setImageUrl("");
            setEditableName("");
        }
        
        setEditPrompt("");
        setInstructionAssets([]);
        setActiveTool('none');
        clearCanvas();
        clearOverlay();

    }, [asset, allAssets, clearCanvas, updateCanvasAndImage]);


    useEffect(() => {
        if(isOpen) {
            resetState();
        }
    }, [isOpen, resetState]);

    const getScaledCoords = (nativeEvent: MouseEvent) => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (nativeEvent.clientX - rect.left) * scaleX, y: (nativeEvent.clientY - rect.top) * scaleY };
    };

    const restoreCanvasState = useCallback((index: number) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasHistory.length > index && canvasHistory[index]) {
            ctx.putImageData(canvasHistory[index], 0, 0);
        }
    }, [canvasHistory]);

    const saveCanvasState = useCallback((ctx: CanvasRenderingContext2D) => {
        const newHistory = canvasHistory.slice(0, historyIndex + 1);
        newHistory.push(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
        setCanvasHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [canvasHistory, historyIndex]);

    const undoCanvas = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            restoreCanvasState(newIndex);
        }
    }, [historyIndex, restoreCanvasState]);

    const redoCanvas = useCallback(() => {
        if (historyIndex < canvasHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            restoreCanvasState(newIndex);
        }
    }, [historyIndex, canvasHistory.length, restoreCanvasState]);

     useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z' && !e.shiftKey;
            const isRedo = (isMac ? e.metaKey : e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey));

            if (isUndo) {
                e.preventDefault();
                e.stopPropagation();
                undoCanvas();
            }
            if (isRedo) {
                e.preventDefault();
                e.stopPropagation();
                redoCanvas();
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, undoCanvas, redoCanvas]);


    const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
        if (activeTool !== 'none') return;
        const { x, y } = getScaledCoords(nativeEvent);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        setStartPoint({x, y});
        setIsDrawing(true);
        ctx.strokeStyle = drawColor; 
        ctx.lineWidth = drawSize; 
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath(); 
        ctx.moveTo(x, y);
    };
    
    const draw = ({ nativeEvent }: React.MouseEvent) => {
        if (!isDrawing || activeTool !== 'none') return;
        const { x, y } = getScaledCoords(nativeEvent);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        if(drawMode !== 'pen') {
            if (historyIndex > -1) restoreCanvasState(historyIndex);
            ctx.beginPath();
        }

        switch(drawMode){
            case 'pen': ctx.lineTo(x, y); ctx.stroke(); break;
            case 'rect': ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y); break;
            case 'oval': ctx.ellipse((startPoint.x + x)/2, (startPoint.y + y)/2, Math.abs((x - startPoint.x)/2), Math.abs((y - startPoint.y)/2), 0, 0, 2 * Math.PI); ctx.stroke(); break;
        }
    };
    
    const stopDrawing = () => {
        if (activeTool !== 'none') return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !isDrawing) return;
        setIsDrawing(false);
        saveCanvasState(ctx);
    };
    
    const handleGenerate = async () => {
        if (!currentAsset || !editPrompt.trim()) return addNotification("Please enter an edit instruction.", 'error');
        setIsGenerating(true);
        addNotification('AI is editing your image...');

        if (devMode) {
            setTimeout(() => {
                onSave(currentAsset, imageUrl, editableName || `${currentAsset.name}_edited(simulated)`);
                addNotification("(Dev Mode) Edit successful! Saving new version.", 'info');
                setIsGenerating(false);
            }, 1500);
            return;
        }
        
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64data = await blobToBase64(blob);

        const instructionAssetPayloads: { base64: string, mimeType: string }[] = [];
        for (const asset of instructionAssets) {
            if (asset.type === 'image') instructionAssetPayloads.push({ base64: await blobToBase64(await (await fetch(asset.previewUrl)).blob()), mimeType: asset.mimeType });
            if (asset.type === 'document') instructionAssetPayloads.push({ base64: btoa(asset.content), mimeType: asset.mimeType });
        }
        
        const canvas = canvasRef.current;
        if (canvas && !isCanvasBlank(canvas)) {
            instructionAssetPayloads.push({ base64: canvas.toDataURL('image/png').split(',')[1], mimeType: 'image/png'});
        }

        const result = await magicEditImage(base64data, blob.type, editPrompt, instructionAssetPayloads);

        if (result.imageUrl) { 
            onSave(currentAsset, result.imageUrl, editableName); 
            addNotification("Edit successful! Saving new version.", 'info'); 
        } 
        else { addNotification(result.error || "Magic Edit failed.", 'error'); }
        setIsGenerating(false);
    };

    const handleSaveAsNew = () => {
        if (currentAsset) {
            onSave(currentAsset, imageUrl, editableName);
        }
    };

    const isCanvasBlank = (canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d');
        if (!context) return true;
        const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        return !pixelBuffer.some(color => color !== 0);
    }

    const processFiles = useCallback(async (files: File[]) => {
        try {
            const newAssets: ReferenceAsset[] = await Promise.all(files.map(async (file): Promise<ReferenceAsset | null> => {
// Fix: Add missing createdAt property.
                if(file.type.startsWith('image/')) return { id: crypto.randomUUID(), type: 'image', name: file.name, previewUrl: URL.createObjectURL(file), base64: '', mimeType: file.type, folderId: null, createdAt: Date.now() };
// Fix: Add missing createdAt property.
                if(file.type.startsWith('text/')) return { id: crypto.randomUUID(), type: 'document', name: file.name, content: await file.text(), mimeType: file.type, folderId: null, createdAt: Date.now() };
                addNotification(`Unsupported file type: ${file.name}`, 'error');
                return null;
            }));
            setInstructionAssets(prev => [...prev, ...newAssets.filter(Boolean) as ReferenceAsset[]]);
        } catch (error) {
            console.error("Error processing files:", error);
            addNotification("An error occurred while uploading assets.", 'error');
        }
    }, [addNotification]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files) processFiles(Array.from(e.target.files));
    };

    // Advanced Tools Logic
    const toggleAdvancedTool = (tool: AdvancedTool) => {
        setActiveTool(prev => {
            const newTool = prev === tool ? 'none' : tool;
            clearOverlay();
            if(newTool === 'resolution' && imageRef.current){
                setNewResolution({w: imageRef.current.naturalWidth, h: imageRef.current.naturalHeight});
            }
            if(newTool === 'crop' && imageRef.current){
                setCropRect({ x: 0, y: 0, width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight });
            }
            return newTool;
        });
    }

    const handleDetect = async () => {
        if (!currentAsset) return;
        setIsGenerating(true);
        addNotification('Detecting objects...');

        if (devMode) {
            setTimeout(() => {
                const dummyDetections = {
                    detections: [
                        { label: 'object 1 (sim)', box: [0.1, 0.1, 0.4, 0.5] },
                        { label: 'object 2 (sim)', box: [0.5, 0.6, 0.9, 0.9] },
                    ]
                };
                addNotification(`(Dev Mode) Found ${dummyDetections.detections.length} objects.`);
                const overlay = overlayCanvasRef.current;
                const ctx = overlay?.getContext('2d');
                if(ctx && overlay){
                    clearOverlay();
                    ctx.font = '16px sans-serif';
                    ctx.lineWidth = 2;
                    dummyDetections.detections.forEach(d => {
                        const [x1, y1, x2, y2] = d.box;
                        const [x, y, w, h] = [x1 * overlay.width, y1 * overlay.height, (x2 - x1) * overlay.width, (y2 - y1) * overlay.height];
                        ctx.strokeStyle = '#FF00FF'; // magenta for simulated
                        ctx.strokeRect(x, y, w, h);
                        ctx.fillStyle = '#FF00FF';
                        ctx.fillText(d.label, x, y > 20 ? y - 5 : y + h + 15);
                    });
                }
                setIsGenerating(false);
            }, 1000);
            return;
        }

        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64data = await blobToBase64(blob);
        const result = await detectObjectsInImage(base64data, blob.type);

        if(result.detections){
            addNotification(`Found ${result.detections.length} objects.`);
            const overlay = overlayCanvasRef.current;
            const ctx = overlay?.getContext('2d');
            if(ctx && overlay){
                clearOverlay();
                ctx.font = '16px sans-serif';
                ctx.lineWidth = 2;
                result.detections.forEach(d => {
                    const [x1, y1, x2, y2] = d.box;
                    const [x, y, w, h] = [x1 * overlay.width, y1 * overlay.height, (x2 - x1) * overlay.width, (y2 - y1) * overlay.height];
                    ctx.strokeStyle = '#00FFFF';
                    ctx.strokeRect(x, y, w, h);
                    ctx.fillStyle = '#00FFFF';
                    ctx.fillText(d.label, x, y > 20 ? y - 5 : y + h + 15);
                });
            }
        } else {
            addNotification(result.error || 'Object detection failed.', 'error');
        }
        setIsGenerating(false);
    }

    const handleApplyResolution = () => {
        const img = imageRef.current;
        if(!img) return;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newResolution.w;
        tempCanvas.height = newResolution.h;
        const ctx = tempCanvas.getContext('2d');
        if(!ctx) return;
        
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillRect(0,0,tempCanvas.width, tempCanvas.height);

        let dx = 0, dy = 0, dw = newResolution.w, dh = newResolution.h;
        if(resizeMode === 'fit' || resizeMode === 'crop'){
            const imgRatio = img.naturalWidth / img.naturalHeight;
            const canvasRatio = newResolution.w / newResolution.h;
            if((resizeMode === 'fit' && imgRatio > canvasRatio) || (resizeMode === 'crop' && imgRatio < canvasRatio)){
                dw = newResolution.w;
                dh = dw / imgRatio;
                dy = (newResolution.h - dh) / 2;
            } else {
                dh = newResolution.h;
                dw = dh * imgRatio;
                dx = (newResolution.w - dw) / 2;
            }
        }
        ctx.drawImage(img, dx, dy, dw, dh);
        updateCanvasAndImage(tempCanvas.toDataURL());
        addNotification("Resolution updated.");
        setActiveTool('none');
    }

    const handleApplyCrop = async () => {
        const img = imageRef.current;
        if (!img) return;
        const isExtending = cropRect.x < 0 || cropRect.y < 0 || (cropRect.x + cropRect.width) > img.naturalWidth || (cropRect.y + cropRect.height) > img.naturalHeight;

        if (isExtending) {
             if (devMode) {
                addNotification('(Dev Mode) Simulating image extension.', 'info');
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = cropRect.width;
                tempCanvas.height = cropRect.height;
                const ctx = tempCanvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, -cropRect.x, -cropRect.y);
                const dataUrl = tempCanvas.toDataURL('image/png');
                updateCanvasAndImage(dataUrl);
                addNotification("Image extended (simulated).", 'info');
                setActiveTool('none');
                return;
            }
            setIsGenerating(true);
            addNotification('Extending image with AI...');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cropRect.width;
            tempCanvas.height = cropRect.height;
            const ctx = tempCanvas.getContext('2d');
            if(!ctx) return;
            ctx.drawImage(img, -cropRect.x, -cropRect.y);
            const dataUrl = tempCanvas.toDataURL('image/png');

            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const result = await extendImage(await blobToBase64(blob), blob.type);
            
            if(result.imageUrl) {
                updateCanvasAndImage(result.imageUrl);
                addNotification("Image extended successfully.");
            } else {
                addNotification(result.error || 'Image extension failed.', 'error');
            }
            setIsGenerating(false);

        } else { // Simple crop
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cropRect.width;
            tempCanvas.height = cropRect.height;
            const ctx = tempCanvas.getContext('2d');
            if(!ctx) return;
            ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
            updateCanvasAndImage(tempCanvas.toDataURL());
            addNotification("Image cropped.");
        }
        setActiveTool('none');
    };
    
    const handleUpscale = async () => {
        if(!currentAsset) return;
        setIsGenerating(true);
        addNotification('Upscaling image (this may take a moment)...');

        if (devMode) {
            setTimeout(() => {
                onSave(currentAsset, imageUrl, `${currentAsset.name}_upscaled(simulated)`);
                addNotification("(Dev Mode) Upscale successful! Saving new version.", 'info');
                setIsGenerating(false);
            }, 2000);
            return;
        }

        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const result = await upscaleImage(await blobToBase64(blob), blob.type);
        if(result.imageUrl) {
            onSave(currentAsset, result.imageUrl, `${editableName}_upscaled`);
            addNotification("Upscale successful! Saving new version.", 'info'); 
        } else {
            addNotification(result.error || 'Upscaling failed.', 'error');
        }
        setIsGenerating(false);
    }
    
    // Crop UI drawing and interaction
    useEffect(() => {
        const overlay = overlayCanvasRef.current;
        const ctx = overlay?.getContext('2d');
        if (activeTool === 'crop' && ctx && overlay) {
            const { x, y, width, height } = cropRect;
            clearOverlay();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, overlay.width, overlay.height);
            ctx.clearRect(x, y, width, height);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            
            // Draw handles
            const handleSize = 10;
            ctx.fillStyle = 'white';
            const handles = {
                tl: [x-handleSize/2, y-handleSize/2], tr: [x+width-handleSize/2, y-handleSize/2],
                bl: [x-handleSize/2, y+height-handleSize/2], br: [x+width-handleSize/2, y+height-handleSize/2],
                t: [x+width/2-handleSize/2, y-handleSize/2], b: [x+width/2-handleSize/2, y+height-handleSize/2],
                l: [x-handleSize/2, y+height/2-handleSize/2], r: [x+width-handleSize/2, y+height/2-handleSize/2],
            };
            Object.values(handles).forEach(([hx, hy]) => ctx.fillRect(hx, hy, handleSize, handleSize));
        }
    }, [activeTool, cropRect]);

    const getHandleAtPos = (x: number, y: number) => {
        const {x: rx, y: ry, width, height} = cropRect;
        const handleSize = 20; // larger click area
        const handles = {
            tl: [rx, ry], tr: [rx+width, ry], bl: [rx, ry+height], br: [rx+width, ry+height],
            t: [rx+width/2, ry], b: [rx+width/2, ry+height], l: [rx, ry+height/2], r: [rx+width, ry+height/2],
            move: [rx+width/2, ry+height/2]
        };
        for(const [name, pos] of Object.entries(handles)){
            if(Math.abs(x-pos[0]) < handleSize && Math.abs(y-pos[1]) < handleSize) return name;
        }
        return null;
    }

    const handleCropMouseDown = ({ nativeEvent }: React.MouseEvent) => {
        if (activeTool !== 'crop') return;
        const { x, y } = getScaledCoords(nativeEvent);
        const handle = getHandleAtPos(x, y);
        if (handle) {
            setDraggingHandle(handle);
            setStartPoint({x, y});
        }
    };
    
    const handleCropMouseMove = ({ nativeEvent }: React.MouseEvent) => {
        if (activeTool !== 'crop' || !draggingHandle) return;
        const { x, y } = getScaledCoords(nativeEvent);
        const dx = x - startPoint.x;
        const dy = y - startPoint.y;

        setCropRect(prev => {
            let {x: ox, y: oy, width: ow, height: oh} = prev;
            if(draggingHandle.includes('l')) { ox += dx; ow -= dx; }
            if(draggingHandle.includes('r')) { ow += dx; }
            if(draggingHandle.includes('t')) { oy += dy; oh -= dy; }
            if(draggingHandle.includes('b')) { oh += dy; }
            if(draggingHandle === 'move') { ox += dx; oy += dy; }
            return {x: ox, y: oy, width: ow > 20 ? ow : 20, height: oh > 20 ? oh : 20};
        });
        setStartPoint({x,y});
    };
    
    const handleCropMouseUp = () => setDraggingHandle(null);
    
    const cursorUrl = useMemo(() => {
        if (drawMode !== 'pen' || activeTool !== 'none') return 'crosshair';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${drawSize+2}" height="${drawSize+2}" viewBox="0 0 ${drawSize+2} ${drawSize+2}"><circle cx="${(drawSize+2)/2}" cy="${(drawSize+2)/2}" r="${drawSize/2}" fill="rgba(255,255,255,0.1)" stroke="white" stroke-width="1" /><circle cx="${(drawSize+2)/2}" cy="${(drawSize+2)/2}" r="1" fill="white" /></svg>`;
        return `url('data:image/svg+xml;utf8,${svg}') ${(drawSize+2)/2} ${(drawSize+2)/2}, auto`;
    }, [drawSize, drawMode, activeTool]);


    if (!isOpen || !currentAsset) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-6xl max-h-[90vh] flex flex-col relative">
                {isGenerating && <LoadingAnimation />}
                 <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3 text-xl font-semibold truncate">
                        <Icon path={ICONS.SPARKLES}/>
                         {isEditingName ? (
                            <input
                                type="text"
                                value={editableName}
                                onChange={e => setEditableName(e.target.value)}
                                onBlur={() => setIsEditingName(false)}
                                onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
                                className="bg-slate-700 text-white p-1 rounded-md text-xl font-semibold"
                                autoFocus
                            />
                        ) : (
                            <h2 onDoubleClick={() => setIsEditingName(true)} className="cursor-pointer p-1 truncate" title={editableName}>{editableName}</h2>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="flex-grow p-4 overflow-y-auto custom-scroll flex flex-col lg:flex-row gap-4 min-h-0">
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 rounded-lg p-2 gap-4">
                       <div className="relative">
                           <img ref={imageRef} src={imageUrl} alt={currentAsset.name} className="max-w-full max-h-[55vh] object-contain rounded" style={{visibility: imageUrl ? 'visible' : 'hidden'}} />
                           <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" style={{zIndex: 1}}/>
                           <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full" style={{zIndex: 2, cursor: cursorUrl}} onMouseDown={activeTool === 'crop' ? handleCropMouseDown : startDrawing} onMouseUp={activeTool === 'crop' ? handleCropMouseUp : stopDrawing} onMouseLeave={activeTool === 'crop' ? handleCropMouseUp : stopDrawing} onMouseMove={activeTool === 'crop' ? handleCropMouseMove : draw} />
                       </div>
                       {history.length > 1 && (
                            <div className="w-full flex justify-center items-center gap-2 p-2">
                                <p className="text-xs text-slate-400 flex-shrink-0">Version History:</p>
                                <div className="flex gap-2 overflow-x-auto custom-scroll">
                                    {history.map(h => <img key={h.id} src={'imageUrl' in h ? h.imageUrl : h.previewUrl} onClick={() => { if(!isGenerating) { setCurrentAsset(h); setEditableName(h.name); updateCanvasAndImage('imageUrl' in h ? h.imageUrl : h.previewUrl); } }} className={`w-14 h-14 object-cover rounded cursor-pointer ring-2 ${currentAsset.id === h.id ? 'ring-cyan-400' : 'ring-transparent hover:ring-slate-500'}`} alt={h.name}/> )}
                                </div>
                            </div>
                       )}
                    </div>
                    <div className="lg:w-96 flex-shrink-0 space-y-4 flex flex-col overflow-y-auto custom-scroll">
                        <div>
                            <label className="font-bold text-lg mb-2 block">Edit Instructions</label>
                            <textarea rows={3} value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g., add a small blue bird on its shoulder" className="w-full bg-slate-700 p-2 rounded text-sm custom-scroll" />
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
                            <label className="font-bold text-sm block">Instructional Assets</label>
                            <div className="flex gap-2 mt-2 overflow-x-auto">{instructionAssets.map(a => <div key={a.id} className="w-12 h-12 rounded bg-slate-700 flex-shrink-0 relative group/asset">
                                {a.type === 'image' ? <img src={(a as any).previewUrl} className="w-full h-full object-cover rounded" alt={a.name}/> : <div className="text-xs p-1">{a.name}</div>}
                                <button onClick={() => setInstructionAssets(ia => ia.filter(i => i.id !== a.id))} className="absolute -top-1 -right-1 bg-red-600 rounded-full w-4 h-4 text-white text-xs opacity-0 group-hover/asset:opacity-100">&times;</button>
                                </div>)}
                            </div>
                            <div className="p-2 border-2 border-dashed rounded-lg border-slate-600 hover:border-slate-500 text-center">
                                <label htmlFor="asset-upload" className="font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer text-sm">Click to upload assets</label>
                                <input id="asset-upload" type="file" className="sr-only" onChange={handleFileSelect} multiple accept="image/*,text/plain"/>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 space-y-2">
                            <button onClick={handleGenerate} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-3 rounded-md transition disabled:bg-slate-500"><Icon path={ICONS.SPARKLES} /> {isGenerating ? 'Generating...' : 'Generate AI Edit'}</button>
                           <div className="flex gap-2">
                               <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-3 rounded-md transition text-sm">Cancel</button>
                               <button onClick={handleSaveAsNew} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-md transition text-sm flex items-center justify-center gap-1.5"><Icon path={ICONS.DOWNLOAD} className="w-4 h-4" /> Save Current State</button>
                           </div>
                        </div>

                        <details className="bg-slate-900/50 rounded-lg group/markup" open>
                           <summary className="p-3 cursor-pointer font-bold list-none flex justify-between items-center">
                                <span>Markup Tools</span>
                                <Icon path={ICONS.CHEVRON_UP} className="w-5 h-5 transition-transform group-open/markup:rotate-180" />
                           </summary>
                           <div className="space-y-3 p-3 border-t border-slate-700">
                                <div className='flex items-center justify-start gap-2'>
                                    <Tooltip text="Pen"><button onClick={() => setDrawMode('pen')} className={`p-2 rounded ${drawMode === 'pen' ? 'bg-cyan-600' : 'bg-slate-700'}`}><Icon path={ICONS.PEN} className="w-5 h-5"/></button></Tooltip>
                                    <Tooltip text="Rectangle"><button onClick={() => setDrawMode('rect')} className={`p-2 rounded ${drawMode === 'rect' ? 'bg-cyan-600' : 'bg-slate-700'}`}><Icon path={ICONS.RECTANGLE} className="w-5 h-5"/></button></Tooltip>
                                    <Tooltip text="Oval"><button onClick={() => setDrawMode('oval')} className={`p-2 rounded ${drawMode === 'oval' ? 'bg-cyan-600' : 'bg-slate-700'}`}><Icon path={ICONS.OVAL} className="w-5 h-5"/></button></Tooltip>
                                </div>
                                <div className="flex items-center justify-start gap-3"><label htmlFor="draw-color" className="text-sm">Color</label><input type="color" id="draw-color" value={drawColor} onChange={e => setDrawColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded bg-slate-700 cursor-pointer"/></div>
                                <div className="flex items-center justify-start gap-3"><label htmlFor="draw-size" className="text-sm">Size</label><div className="w-8 h-8 flex items-center justify-center"><div style={{width: drawSize, height: drawSize, backgroundColor: drawColor, borderRadius: '50%'}}></div></div><input type="range" id="draw-size" min="1" max="50" value={drawSize} onChange={e => setDrawSize(parseInt(e.target.value, 10))} className="flex-1"/><span className="text-sm w-6 text-center">{drawSize}</span></div>
                                <div className="flex items-center gap-2"><Tooltip text="Undo (Ctrl+Z)"><button onClick={undoCanvas} disabled={historyIndex <= 0} className="p-2 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50"><Icon path={ICONS.UNDO}/></button></Tooltip><Tooltip text="Redo (Ctrl+Y)"><button onClick={redoCanvas} disabled={historyIndex >= canvasHistory.length - 1} className="p-2 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50"><Icon path={ICONS.REDO}/></button></Tooltip><button onClick={clearCanvas} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-1.5 px-3 rounded-md transition text-sm">Clear Markup</button></div>
                            </div>
                        </details>
                        
                        <details className="bg-slate-900/50 rounded-lg group/image-details">
                            <summary className="p-3 cursor-pointer font-bold list-none flex justify-between items-center">
                                <span>Image Details</span>
                                <Icon path={ICONS.CHEVRON_UP} className="w-5 h-5 transition-transform group-open/image-details:rotate-180" />
                            </summary>
                            <div className="p-3 border-t border-slate-700 text-sm space-y-2 text-slate-300">
                                <p><strong>Resolution:</strong> {imageRef.current ? `${imageRef.current.naturalWidth} x ${imageRef.current.naturalHeight}` : 'Loading...'}</p>
                                {'prompt' in currentAsset && <p><strong>Prompt:</strong> <span className="text-slate-400 italic">{currentAsset.prompt}</span></p>}
                                <p><strong>Created:</strong> {new Date(currentAsset.createdAt).toLocaleString()}</p>
                            </div>
                        </details>

                        <details className="bg-slate-900/50 rounded-lg group/advanced-tools">
                            <summary className="p-3 cursor-pointer font-bold list-none flex justify-between items-center">
                                <span>Advanced Tools</span>
                                <Icon path={ICONS.CHEVRON_UP} className="w-5 h-5 transition-transform group-open/advanced-tools:rotate-180" />
                            </summary>
                            <div className="p-3 border-t border-slate-700 space-y-2">
                                <button onClick={() => toggleAdvancedTool('detect')} className={`w-full text-left p-2 rounded ${activeTool === 'detect' ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Object Detection</button>
                                {activeTool === 'detect' && <div className="p-2 bg-slate-800 rounded"><button onClick={handleDetect} className="w-full bg-cyan-500 text-white text-sm py-1 rounded">Detect Objects</button></div>}

                                <button onClick={() => toggleAdvancedTool('resolution')} className={`w-full text-left p-2 rounded ${activeTool === 'resolution' ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Edit Resolution</button>
                                {activeTool === 'resolution' && <div className="p-2 bg-slate-800 rounded space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={newResolution.w} onChange={e=>setNewResolution(r=>({...r, w: +e.target.value}))} className="w-1/2 bg-slate-700 p-1 rounded" />
                                        <span>x</span>
                                        <input type="number" value={newResolution.h} onChange={e=>setNewResolution(r=>({...r, h: +e.target.value}))} className="w-1/2 bg-slate-700 p-1 rounded" />
                                    </div>
                                    <div className="relative">
                                        <select value={resizeMode} onChange={e=>setResizeMode(e.target.value as ResizeMode)} className="w-full bg-slate-700 p-2 rounded appearance-none pr-8">
                                            <option value="fit">Fit</option><option value="stretch">Stretch</option><option value="crop">Crop to Fill</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-300">
                                            <Icon path={ICONS.CHEVRON_DOWN} className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <button onClick={handleApplyResolution} className="w-full bg-cyan-500 text-white text-sm py-1 rounded">Apply Resolution</button>
                                </div>}

                                <button onClick={() => toggleAdvancedTool('crop')} className={`w-full text-left p-2 rounded ${activeTool === 'crop' ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Crop & Extend</button>
                                {activeTool === 'crop' && <div className="p-2 bg-slate-800 rounded space-y-2 text-sm">
                                    <p>Drag borders to crop or extend.</p>
                                    <p className="text-xs text-slate-400">Current Size: {Math.round(cropRect.width)} x {Math.round(cropRect.height)}</p>
                                    <button onClick={handleApplyCrop} className="w-full bg-cyan-500 text-white text-sm py-1 rounded">Apply</button>
                                </div>}
                                
                                <button onClick={handleUpscale} className="w-full text-left p-2 rounded bg-slate-700 hover:bg-slate-600">4x Upscale</button>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
};