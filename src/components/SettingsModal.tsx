
import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ICONS, ASPECT_RATIOS, IMAGE_MODELS, IMAGE_RESOLUTIONS } from '@/constants';
import { useBodyScrollLock } from '@/utils/utils';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isBatchMode: boolean;
    setIsBatchMode: (value: boolean) => void;
    showAllPreviews: boolean;
    setShowAllPreviews: (value: boolean) => void;
    defaultAspectRatio: string;
    setDefaultAspectRatio: (value: string) => void;
    defaultResolution: string;
    setDefaultResolution: (value: string) => void;
    batchGenerationCount: number;
    setBatchGenerationCount: (value: number) => void;
    devMode: boolean;
    setDevMode: (value: boolean) => void;
    confirmOnDelete: boolean;
    setConfirmOnDelete: (value: boolean) => void;
    apiKey?: string;
    setApiKey: (value: string) => void;
    localStoragePath?: string;
    setLocalStoragePath: (value: string) => void;
    imageModel: string;
    setImageModel: (value: string) => void;
    sessionCost: number;
    onResetSessionCost: () => void;
}

const Toggle = ({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) => (
    <label className="flex items-center justify-between cursor-pointer group">
        <span className="text-white group-hover:text-cyan-100 transition-colors">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 transition-colors"></div>
        </div>
    </label>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, isBatchMode, setIsBatchMode, showAllPreviews, setShowAllPreviews, 
    defaultAspectRatio, setDefaultAspectRatio, defaultResolution, setDefaultResolution,
    batchGenerationCount, setBatchGenerationCount,
    devMode, setDevMode, confirmOnDelete, setConfirmOnDelete, apiKey, setApiKey,
    localStoragePath, setLocalStoragePath, imageModel, setImageModel,
    sessionCost, onResetSessionCost
 }) => {
    useBodyScrollLock(isOpen);
    
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState(apiKey || '');
    const [storagePathInput, setStoragePathInput] = useState(localStoragePath || '');
    
    useEffect(() => {
        if (isOpen) {
            setApiKeyInput(apiKey || '');
            setStoragePathInput(localStoragePath || '');
            setShowApiKey(false);
        }
    }, [isOpen, apiKey, localStoragePath]);
    
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);
    
    const handleSaveApiKey = () => {
        setApiKey(apiKeyInput);
    };
    
    const handleSaveStoragePath = () => {
        setLocalStoragePath(storagePathInput);
    };
    
    const handleBrowseFolder = () => {
        // In a web environment, we can't directly browse folders
        // This would require a File System Access API or Electron integration
        alert('Note: For web applications, you can manually enter the path. For desktop apps, this would open a folder browser.');
    };
    
    if (!isOpen) return null;

    return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-slate-800/95 rounded-2xl shadow-2xl border border-slate-700/60 w-full max-w-2xl max-h-[85vh] flex flex-col backdrop-blur-xl" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-700/60 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Icon path={ICONS.SETTINGS}/> Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl transition">&times;</button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto custom-scroll flex-grow">
                    {/* API Key Section */}
                    <div className="space-y-4 border-b border-slate-700 pb-6">
                        <h3 className="font-bold text-lg text-slate-300 flex items-center gap-2">
                            <Icon path={ICONS.KEY} className="w-5 h-5" />
                            API Configuration
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-start justify-between">
                                <label className="text-sm text-slate-400 block">Google AI Studio API Key</label>
                                <a 
                                    href="https://aistudio.google.com/app/api-keys" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Get API Key →
                                </a>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        name="api-key"
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Enter your Google AI Studio API key"
                                        autoComplete="new-password"
                                        data-form-type="other"
                                        className="w-full bg-slate-700 text-white rounded-md border border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2.5 pr-10"
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowApiKey(!showApiKey); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                                        type="button"
                                    >
                                        <Icon path={showApiKey ? ICONS.EYE_OFF : ICONS.EYE} className="w-5 h-5" />
                                    </button>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSaveApiKey(); }}
                                    disabled={apiKeyInput === apiKey}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save
                                </button>
                            </div>
                            {apiKey && (
                                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/30 p-2 rounded-md">
                                    <Icon path={ICONS.CHECK} className="w-4 h-4" />
                                    <span>API key is configured</span>
                                </div>
                            )}
                            <p className="text-xs text-slate-400">
                                Your API key is stored securely in your browser's local storage and never sent to any server except the AI service.
                            </p>
                        </div>
                    </div>
                    
                    {/* Storage Location Section */}
                    <div className="space-y-4 border-b border-slate-700 pb-6">
                        <h3 className="font-bold text-lg text-slate-300 flex items-center gap-2">
                            <Icon path={ICONS.FOLDER} className="w-5 h-5" />
                            File Storage
                        </h3>
                        <div className="space-y-3">
                            <label className="text-sm text-slate-400 block">Local Storage Path</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    name="storage-path"
                                    value={storagePathInput}
                                    onChange={(e) => setStoragePathInput(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="e.g., C:\Users\YourName\Documents\AI-Studio"
                                    autoComplete="off"
                                    data-form-type="other"
                                    className="flex-1 bg-slate-700 text-white rounded-md border border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2.5"
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleBrowseFolder(); }}
                                    className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-4 py-2 rounded-md transition"
                                >
                                    Browse
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSaveStoragePath(); }}
                                    disabled={storagePathInput === localStoragePath}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save
                                </button>
                            </div>
                            {localStoragePath && (
                                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/30 p-2 rounded-md">
                                    <Icon path={ICONS.CHECK} className="w-4 h-4" />
                                    <span>Storage path: {localStoragePath}</span>
                                </div>
                            )}
                            <p className="text-xs text-slate-400">
                                Specify where generated images and project files should be saved on your local system.
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-300">Generation</h3>

                        {/* Session Cost */}
                        <div className="bg-slate-900/60 rounded-xl p-3 space-y-2 border border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-300">Estimated Session Cost</span>
                                <button onClick={onResetSessionCost} className="text-xs text-slate-400 hover:text-white transition px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600">Reset</button>
                            </div>
                            <div className="text-2xl font-bold text-cyan-400">${sessionCost.toFixed(4)}</div>
                            <p className="text-xs text-slate-500">Cumulative estimate based on selected model and resolution. Does not include input tokens.</p>
                        </div>

                        {/* Image Model */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-white" htmlFor="image-model">Image Model</label>
                                <select id="image-model" value={imageModel} onChange={e => setImageModel(e.target.value)} className="bg-slate-700 text-white rounded-md border-slate-600 text-sm p-1">
                                    {IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            {/* Per-model pricing table */}
                            <div className="bg-slate-900/60 rounded-lg border border-slate-700/50 overflow-hidden text-xs">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="text-left p-2 text-slate-400 font-semibold">Model</th>
                                            <th className="text-right p-2 text-slate-400 font-semibold">Cost / image</th>
                                            <th className="text-right p-2 text-slate-400 font-semibold">Note</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {IMAGE_MODELS.map(m => {
                                            const costs = Object.entries(m.costPerImage);
                                            const costStr = m.supportsResolution && costs.some(([k]) => k !== 'default')
                                                ? costs.filter(([k]) => k !== 'default').map(([k, v]) => `${k}px: $${v}`).join(' · ')
                                                : `$${m.costPerImage.default ?? Object.values(m.costPerImage)[0]}`;
                                            return (
                                                <tr key={m.id} className={`border-b border-slate-700/30 last:border-0 ${m.id === imageModel ? 'bg-cyan-900/20' : ''}`}>
                                                    <td className="p-2 text-slate-300">{m.name}</td>
                                                    <td className="p-2 text-right text-slate-400 font-mono">{costStr}</td>
                                                    <td className="p-2 text-right text-slate-500">{m.note ?? (m.supportsResolution ? 'res sel.' : 'fixed')}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <Toggle label="Batch Mode" checked={isBatchMode} onChange={setIsBatchMode} />
                        <div className={`flex items-center justify-between transition-opacity ${isBatchMode ? 'opacity-100' : 'opacity-50'}`}>
                            <label className="text-white" htmlFor="batch-count">Images per Prompt</label>
                            <input id="batch-count" type="number" min="1" max="10" value={batchGenerationCount} onChange={e => setBatchGenerationCount(Number(e.target.value))} disabled={!isBatchMode} className="bg-slate-700 text-white rounded-md border-slate-600 text-sm p-1 w-16 text-center" />
                        </div>
                    </div>
                     <div className="space-y-4 border-t border-slate-700 pt-4">
                        <h3 className="font-bold text-lg text-slate-300">Interface</h3>
                        <Toggle label="Show All Previews" checked={showAllPreviews} onChange={setShowAllPreviews} />
                        <div className="flex items-center justify-between">
                            <label className="text-white" htmlFor="aspect-ratio">Default Aspect Ratio</label>
                            <select id="aspect-ratio" value={defaultAspectRatio} onChange={e => setDefaultAspectRatio(e.target.value)} className="bg-slate-700 text-white rounded-md border-slate-600 text-sm p-1">
                                <option value="">None</option>
                                {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-white" htmlFor="default-resolution">Default Resolution</label>
                            <select id="default-resolution" value={defaultResolution} onChange={e => setDefaultResolution(e.target.value)} className="bg-slate-700 text-white rounded-md border-slate-600 text-sm p-1">
                                <option value="">Model default</option>
                                {IMAGE_RESOLUTIONS.map(r => <option key={r} value={r}>{r}px</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="space-y-4 border-t border-slate-700 pt-4">
                        <h3 className="font-bold text-lg text-slate-300">Workflow</h3>
                         <Toggle label="Confirm on Delete" checked={confirmOnDelete} onChange={setConfirmOnDelete} />
                    </div>
                     <div className="space-y-4 border-t border-slate-700 pt-4">
                        <h3 className="font-bold text-lg text-slate-300">Advanced</h3>
                         <Toggle label="Developer Mode" checked={devMode} onChange={setDevMode} />
                         {devMode && <p className="text-xs text-amber-400 bg-amber-900/30 p-2 rounded-md">Dev Mode enabled. Image generation will be simulated to save API costs.</p>}
                    </div>
                     <div className="space-y-4 border-t border-slate-700 pt-4">
                        <h3 className="font-bold text-lg text-red-400">Danger Zone</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white text-sm">Reset All Data</p>
                                <p className="text-xs text-slate-500">Clear all projects, prompts, API key, and settings.</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to reset ALL data? This cannot be undone.')) {
                                        localStorage.removeItem('aiImageStudio_user');
                                        localStorage.removeItem('aiImageStudio_apiKey');
                                        window.location.reload();
                                    }
                                }}
                                className="bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-md transition text-sm"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
