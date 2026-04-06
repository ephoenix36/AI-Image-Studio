// Fix: Import useMemo from React.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icon } from '@/components/Icon';
import { ICONS } from '@/constants';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { magicEditImage, detectObjectsInImage, extendImage, upscaleImage } from '@/services/geminiService';
import { GeneratedAsset, ReferenceAsset, ReferenceImage } from '@/types/types';
import { blobToBase64 } from '@/utils/utils';
import { Tooltip } from '@/components/Tooltip';

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
    const canvasHistoryRef = useRef<ImageData[]>([]);
    const historyIndexRef = useRef(-1);

    const [instructionAssets, setInstructionAssets] = useState<ReferenceAsset[]>([]);

    const [activeTool, setActiveTool] = useState<AdvancedTool>('none');
    
    // Resolution tool state (string-based to avoid cursor jump bug)
    const [newResolutionStr, setNewResolutionStr] = useState({ w: '0', h: '0' });
    const [resizeMode, setResizeMode] = useState<ResizeMode>('fit');
    
    // Crop tool state
    const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [draggingHandle, setDraggingHandle] = useState<string | null>(null);

    // Canvas zoom/pan state
    const [canvasZoom, setCanvasZoom] = useState(1);
    const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
    const [isPanMode, setIsPanMode] = useState(false);
    const [isCanvasDragging, setIsCanvasDragging] = useState(false);
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
    
    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const clearedState = ctx.getImageData(0, 0, canvas.width, canvas.height);
                canvasHistoryRef.current = [clearedState];
                historyIndexRef.current = 0;
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
            setImageUrl(initialUrl);
            
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
        setCanvasZoom(1);
        setCanvasPan({ x: 0, y: 0 });
        setIsPanMode(false);
        clearCanvas();
        clearOverlay();

    }, [asset, allAssets, clearCanvas]);


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
        const targetHistory = canvasHistoryRef.current;
        if (ctx && targetHistory.length > index && targetHistory[index]) {
            ctx.putImageData(targetHistory[index], 0, 0);
        }
    }, []);

    const saveCanvasState = useCallback((ctx: CanvasRenderingContext2D) => {
        const newHistory = canvasHistoryRef.current.slice(0, historyIndexRef.current + 1);
        newHistory.push(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
        canvasHistoryRef.current = newHistory;
        historyIndexRef.current = newHistory.length - 1;
        setCanvasHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, []);

    const undoCanvas = useCallback(() => {
        if (historyIndexRef.current > 0) {
            const newIndex = historyIndexRef.current - 1;
            historyIndexRef.current = newIndex;
            setHistoryIndex(newIndex);
            restoreCanvasState(newIndex);
        }
    }, [restoreCanvasState]);

    const redoCanvas = useCallback(() => {
        if (historyIndexRef.current < canvasHistoryRef.current.length - 1) {
            const newIndex = historyIndexRef.current + 1;
            historyIndexRef.current = newIndex;
            setHistoryIndex(newIndex);
            restoreCanvasState(newIndex);
        }
    }, [restoreCanvasState]);

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
        if (activeTool !== 'none' || isPanMode) return;
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
        if (!isDrawing || activeTool !== 'none' || isPanMode) return;
        const { x, y } = getScaledCoords(nativeEvent);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        if(drawMode !== 'pen') {
            if (historyIndexRef.current > -1) restoreCanvasState(historyIndexRef.current);
            ctx.beginPath();
            ctx.strokeStyle = drawColor;
            ctx.lineWidth = drawSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }

        switch(drawMode){
            case 'pen': ctx.lineTo(x, y); ctx.stroke(); break;
            case 'rect': ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y); break;
            case 'oval': ctx.ellipse((startPoint.x + x)/2, (startPoint.y + y)/2, Math.abs((x - startPoint.x)/2), Math.abs((y - startPoint.y)/2), 0, 0, 2 * Math.PI); ctx.stroke(); break;
        }
    };
    
    const stopDrawing = () => {
        if (activeTool !== 'none' || isPanMode) return;
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
                setNewResolutionStr({w: String(imageRef.current.naturalWidth), h: String(imageRef.current.naturalHeight)});
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
        const w = Math.max(1, parseInt(newResolutionStr.w, 10) || 0);
        const h = Math.max(1, parseInt(newResolutionStr.h, 10) || 0);
        if (!w || !h) return addNotification("Invalid resolution dimensions.", 'error');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const ctx = tempCanvas.getContext('2d');
        if(!ctx) return;
        
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillRect(0,0,tempCanvas.width, tempCanvas.height);

        let dx = 0, dy = 0, dw = w, dh = h;
        if(resizeMode === 'fit' || resizeMode === 'crop'){
            const imgRatio = img.naturalWidth / img.naturalHeight;
            const canvasRatio = w / h;
            if((resizeMode === 'fit' && imgRatio > canvasRatio) || (resizeMode === 'crop' && imgRatio < canvasRatio)){
                dw = w;
                dh = dw / imgRatio;
                dy = (h - dh) / 2;
            } else {
                dh = h;
                dw = dh * imgRatio;
                dx = (w - dw) / 2;
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
        addNotification('Upscaling image... splitting into chunks for best quality.');

        if (devMode) {
            setTimeout(() => {
                onSave(currentAsset, imageUrl, `${editableName}_upscaled(sim)`);
                addNotification("(Dev Mode) Upscale complete.", 'info');
                setIsGenerating(false);
            }, 2000);
            return;
        }

        try {
            const img = imageRef.current;
            if (!img) throw new Error('Image not loaded');
            const natW = img.naturalWidth;
            const natH = img.naturalHeight;
            // Decide whether to split into 2 or 4 chunks based on image size
            const chunkCols = natW >= 512 ? 2 : 1;
            const chunkRows = natH >= 512 ? 2 : 1;
            const overlap = Math.min(32, Math.floor(natW / 8), Math.floor(natH / 8));
            const chunkW = Math.ceil(natW / chunkCols);
            const chunkH = Math.ceil(natH / chunkRows);

            const chunks: { base64: string; mimeType: string; col: number; row: number }[] = [];
            for (let row = 0; row < chunkRows; row++) {
                for (let col = 0; col < chunkCols; col++) {
                    const sx = Math.max(0, col * chunkW - overlap);
                    const sy = Math.max(0, row * chunkH - overlap);
                    const sw = Math.min(chunkW + overlap * 2, natW - sx);
                    const sh = Math.min(chunkH + overlap * 2, natH - sy);
                    const tmp = document.createElement('canvas');
                    tmp.width = sw; tmp.height = sh;
                    const ctx = tmp.getContext('2d');
                    if (!ctx) continue;
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                    const dataUrl = tmp.toDataURL('image/png');
                    const resp = await fetch(dataUrl);
                    const blob = await resp.blob();
                    chunks.push({ base64: await blobToBase64(blob), mimeType: 'image/png', col, row });
                }
            }

            // Upscale each chunk with AI
            const upscaledChunks: { dataUrl: string; col: number; row: number }[] = [];
            for (const chunk of chunks) {
                const result = await upscaleImage(chunk.base64, chunk.mimeType);
                if (!result.imageUrl) throw new Error(result.error || 'Chunk upscale failed');
                upscaledChunks.push({ dataUrl: result.imageUrl, col: chunk.col, row: chunk.row });
            }

            // Load all upscaled chunks and get their dimensions
            const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
                const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
            });
            const loadedChunks = await Promise.all(upscaledChunks.map(async c => ({ ...c, img: await loadImg(c.dataUrl) })));
            const firstChunk = loadedChunks[0];
            const scaleFactor = firstChunk.img.width / (chunkW + overlap * 2);
            const outW = Math.round(natW * scaleFactor);
            const outH = Math.round(natH * scaleFactor);
            const outOverlap = Math.round(overlap * scaleFactor);

            const out = document.createElement('canvas');
            out.width = outW; out.height = outH;
            const outCtx = out.getContext('2d');
            if (!outCtx) throw new Error('Failed to create output canvas');

            for (const { img: chunkImg, col, row } of loadedChunks) {
                const destX = Math.round(col * chunkW * scaleFactor);
                const destY = Math.round(row * chunkH * scaleFactor);
                const srcX = col === 0 ? 0 : outOverlap;
                const srcY = row === 0 ? 0 : outOverlap;
                const drawW = col === chunkCols - 1 ? chunkImg.width - srcX : Math.round(chunkW * scaleFactor);
                const drawH = row === chunkRows - 1 ? chunkImg.height - srcY : Math.round(chunkH * scaleFactor);
                outCtx.drawImage(chunkImg, srcX, srcY, drawW, drawH, destX, destY, drawW, drawH);
            }

            const finalDataUrl = out.toDataURL('image/png');
            onSave(currentAsset, finalDataUrl, `${editableName}_upscaled`);
            addNotification(`Upscale complete! New size: ${outW}×${outH}`, 'info');
        } catch (err: any) {
            addNotification(err.message || 'Upscaling failed.', 'error');
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

    // Document-level crop handle dragging (allows dragging beyond canvas bounds for extension)
    useEffect(() => {
        if (!draggingHandle || activeTool !== 'crop') return;

        const handleMouseMove = (e: MouseEvent) => {
            const { x, y } = getScaledCoords(e);
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
            setStartPoint({x, y});
        };

        const handleMouseUp = () => setDraggingHandle(null);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingHandle, startPoint, activeTool, getScaledCoords]);
    
    const handleCropMouseMove = ({ nativeEvent }: React.MouseEvent) => {
        // Handled by document-level listener when dragging; this is just for cursor adjustments
        if (activeTool !== 'crop' || draggingHandle) return;
        const { x, y } = getScaledCoords(nativeEvent);
        const handle = getHandleAtPos(x, y);
        const overlay = overlayCanvasRef.current;
        if (overlay) {
            overlay.style.cursor = handle ? (handle === 'move' ? 'move' : 'crosshair') : 'default';
        }
    };
    
    const handleCropMouseUp = () => setDraggingHandle(null);

    const getCropDisplacements = useCallback(() => {
        const img = imageRef.current;
        if (!img) return { top: 0, bottom: 0, left: 0, right: 0 };

        return {
            top: Math.round(-cropRect.y),
            bottom: Math.round(cropRect.y + cropRect.height - img.naturalHeight),
            left: Math.round(-cropRect.x),
            right: Math.round(cropRect.x + cropRect.width - img.naturalWidth),
        };
    }, [cropRect]);

    const setCropFromDisplacements = useCallback((partial: Partial<{ top: number; bottom: number; left: number; right: number }>) => {
        const img = imageRef.current;
        if (!img) return;

        const current = { ...getCropDisplacements(), ...partial };
        const nextWidth = Math.max(20, img.naturalWidth + current.left + current.right);
        const nextHeight = Math.max(20, img.naturalHeight + current.top + current.bottom);

        setCropRect({
            x: -current.left,
            y: -current.top,
            width: nextWidth,
            height: nextHeight,
        });
    }, [getCropDisplacements]);
    
    const cursorUrl = useMemo(() => {
        if (drawMode !== 'pen' || activeTool !== 'none') return 'crosshair';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${drawSize+2}" height="${drawSize+2}" viewBox="0 0 ${drawSize+2} ${drawSize+2}"><circle cx="${(drawSize+2)/2}" cy="${(drawSize+2)/2}" r="${drawSize/2}" fill="rgba(255,255,255,0.1)" stroke="white" stroke-width="1" /><circle cx="${(drawSize+2)/2}" cy="${(drawSize+2)/2}" r="1" fill="white" /></svg>`;
        return `url('data:image/svg+xml;utf8,${svg}') ${(drawSize+2)/2} ${(drawSize+2)/2}, auto`;
    }, [drawSize, drawMode, activeTool]);


    if (!isOpen || !currentAsset) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center p-4 z-[70]">
            <div className="bg-slate-800/95 rounded-2xl shadow-2xl border border-slate-700/60 w-full max-w-6xl max-h-[90vh] flex flex-col relative backdrop-blur-xl">
                {isGenerating && <LoadingAnimation />}
                 <div className="px-5 py-4 border-b border-slate-700/60 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3 text-lg font-semibold truncate">
                        <Icon path={ICONS.SPARKLES} className="w-5 h-5 text-cyan-400"/>
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
                    {/* Left: Canvas area with zoom/pan */}
                    <div 
                        className="flex-1 flex flex-col bg-slate-900/50 rounded-lg p-2 min-h-0 overflow-hidden relative group/canvas"
                        onWheel={e => {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const mouseX = e.clientX - (rect.left + rect.width / 2);
                            const mouseY = e.clientY - (rect.top + rect.height / 2);
                            setCanvasZoom(prev => {
                                const newZoom = Math.max(0.5, Math.min(5, +(prev + delta).toFixed(2)));
                                const factor = newZoom / prev;
                                setCanvasPan(p => ({ x: mouseX + (p.x - mouseX) * factor, y: mouseY + (p.y - mouseY) * factor }));
                                return newZoom;
                            });
                        }}
                        onMouseDown={e => {
                            if (isPanMode) {
                                setIsCanvasDragging(true);
                                dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, panX: canvasPan.x, panY: canvasPan.y };
                            }
                        }}
                        onMouseMove={e => {
                            if (isCanvasDragging && isPanMode) {
                                setCanvasPan({ x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.mouseX), y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.mouseY) });
                            }
                        }}
                        onMouseUp={() => setIsCanvasDragging(false)}
                        onMouseLeave={() => setIsCanvasDragging(false)}
                        style={{ cursor: isPanMode ? (isCanvasDragging ? 'grabbing' : 'grab') : undefined }}
                    >
                        {/* Zoom Controls */}
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 opacity-0 group-hover/canvas:opacity-100 transition-opacity">
                            <Tooltip text="Pan mode (drag to pan)"><button onClick={() => setIsPanMode(p => !p)} className={`w-7 h-7 flex items-center justify-center rounded text-sm transition ${isPanMode ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>✋</button></Tooltip>
                            <button onClick={() => { const nz = Math.min(5, +(canvasZoom + 0.25).toFixed(2)); const f = nz/canvasZoom; setCanvasPan(p => ({x: p.x*f, y: p.y*f})); setCanvasZoom(nz); }} className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-sm font-bold text-white">+</button>
                            <span className="text-xs text-slate-400 w-9 text-center tabular-nums">{Math.round(canvasZoom*100)}%</span>
                            <button onClick={() => { const nz = Math.max(0.5, +(canvasZoom - 0.25).toFixed(2)); const f = nz/canvasZoom; setCanvasPan(p => ({x: p.x*f, y: p.y*f})); setCanvasZoom(nz); }} className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-sm font-bold text-white">−</button>
                            <button onClick={() => { setCanvasZoom(1); setCanvasPan({x:0,y:0}); }} className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-xs text-white">↺</button>
                        </div>

                        <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0 w-full">
                            <div style={{ transform: `scale(${canvasZoom}) translate(${canvasPan.x / canvasZoom}px, ${canvasPan.y / canvasZoom}px)`, transformOrigin: 'center center', transition: isCanvasDragging ? 'none' : 'transform 0.05s ease-out' }}>
                                <div className="relative">
                                    <img 
                                        ref={imageRef} 
                                        src={imageUrl} 
                                        alt={currentAsset.name} 
                                        className="max-w-full max-h-[50vh] object-contain rounded" 
                                        style={{visibility: imageUrl ? 'visible' : 'hidden'}}
                                        onLoad={() => {
                                            const img = imageRef.current;
                                            if (!img) return;
                                            const canvas = canvasRef.current;
                                            const overlay = overlayCanvasRef.current;
                                            if (canvas && overlay && (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight)) {
                                                canvas.width = img.naturalWidth;
                                                canvas.height = img.naturalHeight;
                                                overlay.width = img.naturalWidth;
                                                overlay.height = img.naturalHeight;
                                                clearCanvas();
                                                clearOverlay();
                                            }
                                        }}
                                    />
                                    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" style={{zIndex: 1, pointerEvents: 'none'}}/>
                                    <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full" style={{zIndex: 2, cursor: isPanMode ? 'inherit' : cursorUrl, pointerEvents: isPanMode ? 'none' : 'auto'}} onMouseDown={activeTool === 'crop' ? handleCropMouseDown : startDrawing} onMouseUp={activeTool === 'crop' ? handleCropMouseUp : stopDrawing} onMouseLeave={activeTool === 'crop' ? handleCropMouseUp : stopDrawing} onMouseMove={activeTool === 'crop' ? handleCropMouseMove : draw} />
                                </div>
                            </div>
                        </div>

                        {history.length > 1 && (
                            <div className="flex-shrink-0 flex justify-center items-center gap-2 p-2 border-t border-slate-700/40 mt-2">
                                <p className="text-xs text-slate-400 flex-shrink-0">History:</p>
                                <div className="flex gap-2 overflow-x-auto custom-scroll">
                                    {history.map(h => <img key={h.id} src={'imageUrl' in h ? h.imageUrl : h.previewUrl} onClick={() => { if(!isGenerating) { setCurrentAsset(h); setEditableName(h.name); updateCanvasAndImage('imageUrl' in h ? h.imageUrl : h.previewUrl); } }} className={`w-12 h-12 object-cover rounded cursor-pointer ring-2 ${currentAsset.id === h.id ? 'ring-cyan-400' : 'ring-transparent hover:ring-slate-500'}`} alt={h.name}/> )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Controls */}
                    <div className="lg:w-96 flex-shrink-0 space-y-3 flex flex-col overflow-y-auto overflow-x-visible custom-scroll max-h-full">
                        {/* Edit Instructions */}
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                            <label className="font-semibold text-base mb-2 block text-white">Edit Instructions</label>
                            <textarea rows={3} value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g., add a small blue bird on its shoulder" className="w-full bg-slate-800/80 p-2.5 rounded-lg text-sm custom-scroll border border-slate-600/50 focus:ring-cyan-500 focus:border-cyan-500 transition placeholder:text-slate-500" />
                        </div>

                        {/* Instruction Assets */}
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Instruction Assets</label>
                            {instructionAssets.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto mb-2 pb-1 custom-scroll">{instructionAssets.map(a => <div key={a.id} className="w-12 h-12 rounded-lg bg-slate-700/80 flex-shrink-0 relative group/asset overflow-hidden ring-1 ring-slate-600/50">
                                    {a.type === 'image' ? <img src={(a as any).previewUrl} className="w-full h-full object-cover" alt={a.name}/> : <div className="text-[10px] p-1 text-slate-400 leading-tight">{a.name}</div>}
                                    <button onClick={() => setInstructionAssets(ia => ia.filter(i => i.id !== a.id))} className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-4 h-4 text-white text-[10px] opacity-0 group-hover/asset:opacity-100 transition-opacity flex items-center justify-center">&times;</button>
                                    </div>)}
                                </div>
                            )}
                            <div className="border-2 border-dashed rounded-lg border-slate-600/60 hover:border-cyan-500/40 text-center py-2 transition-colors">
                                <label htmlFor="asset-upload" className="font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer text-xs transition-colors">+ Add reference images or docs</label>
                                <input id="asset-upload" type="file" className="sr-only" onChange={handleFileSelect} multiple accept="image/*,text/plain"/>
                            </div>
                        </div>

                        {/* Markup Tools */}
                        <details className="bg-slate-900/60 rounded-xl group border border-slate-700/50 overflow-visible relative z-20" open>
                           <summary className="px-4 py-3 cursor-pointer font-semibold text-sm list-none flex justify-between items-center hover:bg-slate-800/40 transition-colors">
                                <span>Markup Tools</span>
                                <Icon path={ICONS.CHEVRON_UP} className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
                           </summary>
                           <div className="space-y-3 px-4 pb-4 border-t border-slate-700/50 pt-3">
                                <div className='flex items-center gap-1.5'>
                                    <Tooltip text="Pen"><button onClick={() => setDrawMode('pen')} className={`p-2 rounded-lg transition-all ${drawMode === 'pen' ? 'bg-cyan-600 shadow-lg shadow-cyan-600/20' : 'bg-slate-700/80 hover:bg-slate-600'}`}><Icon path={ICONS.PEN} className="w-4 h-4"/></button></Tooltip>
                                    <Tooltip text="Rectangle"><button onClick={() => setDrawMode('rect')} className={`p-2 rounded-lg transition-all ${drawMode === 'rect' ? 'bg-cyan-600 shadow-lg shadow-cyan-600/20' : 'bg-slate-700/80 hover:bg-slate-600'}`}><Icon path={ICONS.RECTANGLE} className="w-4 h-4"/></button></Tooltip>
                                    <Tooltip text="Oval"><button onClick={() => setDrawMode('oval')} className={`p-2 rounded-lg transition-all ${drawMode === 'oval' ? 'bg-cyan-600 shadow-lg shadow-cyan-600/20' : 'bg-slate-700/80 hover:bg-slate-600'}`}><Icon path={ICONS.OVAL} className="w-4 h-4"/></button></Tooltip>
                                    <div className="w-px h-6 bg-slate-600 mx-1"></div>
                                    <label htmlFor="draw-color" className="sr-only">Color</label>
                                    <input type="color" id="draw-color" value={drawColor} onChange={e => setDrawColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded-lg bg-slate-700/80 cursor-pointer" title="Brush color"/>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label htmlFor="draw-size" className="text-xs text-slate-400 w-8 flex-shrink-0">Size</label>
                                    <div className="w-6 h-6 flex items-center justify-center flex-shrink-0"><div style={{width: Math.min(drawSize, 24), height: Math.min(drawSize, 24), backgroundColor: drawColor, borderRadius: '50%'}}></div></div>
                                    <input type="range" id="draw-size" min="1" max="50" value={drawSize} onChange={e => setDrawSize(parseInt(e.target.value, 10))} className="flex-1 accent-cyan-500"/>
                                    <span className="text-xs text-slate-400 w-6 text-right tabular-nums">{drawSize}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Tooltip text="Undo (Ctrl+Z)"><button onClick={undoCanvas} disabled={historyIndex <= 0} className="p-2 bg-slate-700/80 hover:bg-slate-600 rounded-lg transition disabled:opacity-30"><Icon path={ICONS.UNDO} className="w-4 h-4"/></button></Tooltip>
                                    <Tooltip text="Redo (Ctrl+Y)"><button onClick={redoCanvas} disabled={historyIndex >= canvasHistory.length - 1} className="p-2 bg-slate-700/80 hover:bg-slate-600 rounded-lg transition disabled:opacity-30"><Icon path={ICONS.REDO} className="w-4 h-4"/></button></Tooltip>
                                    <button onClick={clearCanvas} className="flex-1 bg-slate-700/80 hover:bg-slate-600 text-white font-medium py-2 px-3 rounded-lg transition text-xs">Clear Markup</button>
                                </div>
                            </div>
                        </details>

                        {/* Advanced Tools */}
                        <details className="bg-slate-900/60 rounded-xl group border border-slate-700/50 overflow-visible relative z-10">
                            <summary className="px-4 py-3 cursor-pointer font-semibold text-sm list-none flex justify-between items-center hover:bg-slate-800/40 transition-colors">
                                <span>Advanced Tools</span>
                                <Icon path={ICONS.CHEVRON_UP} className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-2">
                                <button onClick={() => toggleAdvancedTool('detect')} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTool === 'detect' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'bg-slate-700/80 hover:bg-slate-600 text-slate-300'}`}>
                                    Object Detection
                                </button>
                                {activeTool === 'detect' && <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-600/30"><button onClick={handleDetect} disabled={isGenerating} className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50">Run Detection</button></div>}

                                <button onClick={() => toggleAdvancedTool('resolution')} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTool === 'resolution' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'bg-slate-700/80 hover:bg-slate-600 text-slate-300'}`}>
                                    Edit Resolution
                                </button>
                                {activeTool === 'resolution' && <div className="p-3 bg-slate-800/80 rounded-lg space-y-2.5 text-sm border border-slate-600/30">
                                    <div className="flex items-center gap-2">
                                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={newResolutionStr.w} onChange={e => setNewResolutionStr(r => ({...r, w: e.target.value.replace(/\D/g, '')}))} onFocus={e => e.target.select()} className="w-1/2 bg-slate-700/80 p-2 rounded-lg text-center border border-slate-600/50 focus:ring-cyan-500 focus:border-cyan-500" placeholder="Width" />
                                        <span className="text-slate-500 text-xs">×</span>
                                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={newResolutionStr.h} onChange={e => setNewResolutionStr(r => ({...r, h: e.target.value.replace(/\D/g, '')}))} onFocus={e => e.target.select()} className="w-1/2 bg-slate-700/80 p-2 rounded-lg text-center border border-slate-600/50 focus:ring-cyan-500 focus:border-cyan-500" placeholder="Height" />
                                    </div>
                                    <div className="relative">
                                        <select value={resizeMode} onChange={e=>setResizeMode(e.target.value as ResizeMode)} className="w-full bg-slate-700/80 p-2 rounded-lg appearance-none pr-8 border border-slate-600/50">
                                            <option value="fit">Fit</option><option value="stretch">Stretch</option><option value="crop">Crop to Fill</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                            <Icon path={ICONS.CHEVRON_DOWN} className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <button onClick={handleApplyResolution} className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-semibold py-2 rounded-lg transition">Apply Resolution</button>
                                </div>}

                                <button onClick={() => toggleAdvancedTool('crop')} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTool === 'crop' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'bg-slate-700/80 hover:bg-slate-600 text-slate-300'}`}>
                                    Crop & Extend
                                </button>
                                {activeTool === 'crop' && <div className="p-3 bg-slate-800/80 rounded-lg space-y-2 text-sm border border-slate-600/30">
                                    <p className="text-slate-400 text-xs">Drag handles to crop. Drag beyond the image edge to extend with AI outpainting.</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <label className="flex flex-col gap-1 text-slate-400">
                                            Top
                                            <input
                                                type="number"
                                                value={getCropDisplacements().top}
                                                onChange={(e) => setCropFromDisplacements({ top: Number(e.target.value) || 0 })}
                                                className="bg-slate-700/80 p-2 rounded-lg border border-slate-600/50 text-white"
                                            />
                                        </label>
                                        <label className="flex flex-col gap-1 text-slate-400">
                                            Bottom
                                            <input
                                                type="number"
                                                value={getCropDisplacements().bottom}
                                                onChange={(e) => setCropFromDisplacements({ bottom: Number(e.target.value) || 0 })}
                                                className="bg-slate-700/80 p-2 rounded-lg border border-slate-600/50 text-white"
                                            />
                                        </label>
                                        <label className="flex flex-col gap-1 text-slate-400">
                                            Left
                                            <input
                                                type="number"
                                                value={getCropDisplacements().left}
                                                onChange={(e) => setCropFromDisplacements({ left: Number(e.target.value) || 0 })}
                                                className="bg-slate-700/80 p-2 rounded-lg border border-slate-600/50 text-white"
                                            />
                                        </label>
                                        <label className="flex flex-col gap-1 text-slate-400">
                                            Right
                                            <input
                                                type="number"
                                                value={getCropDisplacements().right}
                                                onChange={(e) => setCropFromDisplacements({ right: Number(e.target.value) || 0 })}
                                                className="bg-slate-700/80 p-2 rounded-lg border border-slate-600/50 text-white"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-[11px] text-slate-500">Positive values extend outward. Negative values crop inward.</p>
                                    <p className="text-xs text-slate-500 font-mono">Size: {Math.round(cropRect.width)} × {Math.round(cropRect.height)} {(cropRect.x < 0 || cropRect.y < 0 || (cropRect.x + cropRect.width) > (imageRef.current?.naturalWidth||0) || (cropRect.y + cropRect.height) > (imageRef.current?.naturalHeight||0)) && <span className="text-amber-400 ml-1">↔ Extend (AI)</span>}</p>
                                    <button onClick={handleApplyCrop} disabled={isGenerating} className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50">Apply</button>
                                </div>}
                                
                                <button onClick={handleUpscale} disabled={isGenerating} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium bg-slate-700/80 hover:bg-slate-600 text-slate-300 transition-all disabled:opacity-50">
                                    Upscale
                                </button>
                            </div>
                        </details>

                        {/* Image Details — below advanced tools */}
                        <details className="bg-slate-900/60 rounded-xl group border border-slate-700/50 overflow-visible relative z-0">
                            <summary className="px-4 py-3 cursor-pointer font-semibold text-sm list-none flex justify-between items-center hover:bg-slate-800/40 transition-colors">
                                <span>Image Details</span>
                                <Icon path={ICONS.CHEVRON_UP} className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 text-xs space-y-2 text-slate-400">
                                <div className="flex justify-between items-center"><span className="text-slate-500 flex-shrink-0 mr-2">Resolution</span> <span className="text-white font-mono">{imageRef.current ? `${imageRef.current.naturalWidth} × ${imageRef.current.naturalHeight}` : '...'}</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-500 flex-shrink-0 mr-2">Created</span> <span className="text-white">{new Date(currentAsset.createdAt).toLocaleDateString()}</span></div>
                                {'prompt' in currentAsset && currentAsset.prompt && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500">Prompt</span>
                                        <span className="text-slate-300 italic text-xs leading-relaxed select-text">{currentAsset.prompt}</span>
                                    </div>
                                )}
                            </div>
                        </details>
                        
                        {/* Action Buttons */}
                        <div className="mt-auto pt-3 space-y-2 sticky bottom-0 bg-slate-800/95 pb-1">
                            <button onClick={handleGenerate} disabled={isGenerating || !editPrompt.trim()} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-cyan-600/20 hover:shadow-cyan-500/30 disabled:opacity-50 disabled:shadow-none disabled:from-slate-600 disabled:to-slate-600">
                                <Icon path={ICONS.SPARKLES} className="w-5 h-5" /> {isGenerating ? 'Generating...' : 'Generate AI Edit'}
                            </button>
                           <div className="flex gap-2">
                               <button onClick={onClose} className="flex-1 bg-slate-700/80 hover:bg-slate-600 text-white font-semibold py-2.5 px-3 rounded-xl transition text-sm">Cancel</button>
                               <button onClick={handleSaveAsNew} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-3 rounded-xl transition text-sm flex items-center justify-center gap-1.5"><Icon path={ICONS.DOWNLOAD} className="w-4 h-4" /> Save State</button>
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};