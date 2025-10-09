import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { ICONS, ASPECT_RATIOS } from '../constants';
import * as Storage from '../services/storageService';
import type { StorageMode } from '../services/storageService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isBatchMode: boolean;
    setIsBatchMode: (value: boolean) => void;
    showAllPreviews: boolean;
    setShowAllPreviews: (value: boolean) => void;
    defaultAspectRatio: string;
    setDefaultAspectRatio: (value: string) => void;
    batchGenerationCount: number;
    setBatchGenerationCount: (value: number) => void;
    devMode: boolean;
    setDevMode: (value: boolean) => void;
    confirmOnDelete: boolean;
    setConfirmOnDelete: (value: boolean) => void;
    useAINaming: boolean;
    setUseAINaming: (value: boolean) => void;
}

const Toggle = ({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="text-white">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
        </div>
    </label>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, isBatchMode, setIsBatchMode, showAllPreviews, setShowAllPreviews, 
    defaultAspectRatio, setDefaultAspectRatio, batchGenerationCount, setBatchGenerationCount,
    devMode, setDevMode, confirmOnDelete, setConfirmOnDelete, useAINaming, setUseAINaming
 }) => {
    const [storageMode, setStorageMode] = useState<StorageMode>('localstorage');
    const [storageLocation, setStorageLocation] = useState<string>('');
    const [storageSupported, setStorageSupported] = useState(false);
    const [isChangingStorage, setIsChangingStorage] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadStorageInfo();
        }
    }, [isOpen]);

    const loadStorageInfo = async () => {
        const info = await Storage.getStorageInfo();
        setStorageMode(info.mode);
        setStorageLocation(info.location || 'Browser Storage');
        setStorageSupported(info.supported);
    };

    const handleChangeStorageLocation = async () => {
        setIsChangingStorage(true);
        const result = await Storage.changeStorageLocation();
        setIsChangingStorage(false);
        
        if (result.success) {
            await loadStorageInfo();
        } else {
            alert(result.error || 'Failed to change storage location');
        }
    };

    const handleMigrateToFileSystem = async () => {
        if (!confirm('This will migrate your data from browser storage to a file on your device. Continue?')) {
            return;
        }
        
        setIsChangingStorage(true);
        const result = await Storage.migrateToFileSystem();
        setIsChangingStorage(false);
        
        if (result.success) {
            await loadStorageInfo();
            alert('Successfully migrated to file system storage!');
        } else {
            alert(result.error || 'Failed to migrate to file system');
        }
    };

    const handleExportData = async () => {
        const result = await Storage.exportData();
        if (!result.success) {
            alert(result.error || 'Failed to export data');
        }
    };

    const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('This will replace all your current data. Continue?')) {
            e.target.value = '';
            return;
        }

        const result = await Storage.importData(file);
        if (result.success && result.data) {
            const saveResult = await Storage.saveUsers(result.data);
            if (saveResult.success) {
                alert('Data imported successfully! Please refresh the page.');
                window.location.reload();
            } else {
                alert(saveResult.error || 'Failed to save imported data');
            }
        } else {
            alert(result.error || 'Failed to import data');
        }
        e.target.value = '';
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Icon path={ICONS.SETTINGS}/> Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-300">Generation</h3>
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
                                {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="space-y-4 border-t border-slate-700 pt-4">
                        <h3 className="font-bold text-lg text-slate-300">Workflow</h3>
                        <Toggle label="Confirm on Delete" checked={confirmOnDelete} onChange={setConfirmOnDelete} />
                        <Toggle 
                            label="AI-Powered Prompt Naming" 
                            checked={useAINaming} 
                            onChange={setUseAINaming} 
                        />
                        <p className="text-xs text-slate-400">When enabled, AI will automatically generate descriptive names for your custom prompts based on their content.</p>
                    </div>
                     <div className="space-y-4 border-t border-slate-700 pt-4">
                        <h3 className="font-bold text-lg text-slate-300">Storage</h3>
                        <div className="space-y-3">
                            <div className="bg-slate-900/50 p-3 rounded-md space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">Storage Type:</span>
                                    <span className="text-white font-medium">{storageMode === 'filesystem' ? 'File System' : 'Browser Storage'}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">Location:</span>
                                    <span className="text-white font-medium text-right truncate ml-2">{storageLocation}</span>
                                </div>
                            </div>
                            
                            {storageSupported && (
                                <>
                                    {storageMode === 'localstorage' ? (
                                        <button
                                            onClick={handleMigrateToFileSystem}
                                            disabled={isChangingStorage}
                                            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition"
                                        >
                                            {isChangingStorage ? 'Migrating...' : 'Switch to File System Storage'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleChangeStorageLocation}
                                            disabled={isChangingStorage}
                                            className="w-full bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition"
                                        >
                                            {isChangingStorage ? 'Changing...' : 'Change Storage Folder'}
                                        </button>
                                    )}
                                    {storageMode === 'localstorage' && (
                                        <p className="text-xs text-amber-400 bg-amber-900/30 p-2 rounded-md">
                                            File system storage removes the 5-10MB browser limit and stores data on your device.
                                        </p>
                                    )}
                                </>
                            )}
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportData}
                                    className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition text-sm"
                                >
                                    Export Backup
                                </button>
                                <label className="flex-1">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImportData}
                                        className="hidden"
                                    />
                                    <span className="block bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition text-sm text-center cursor-pointer">
                                        Import Backup
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                     <div className="space-y-4 border-t border-slate-700 pt-4">
                        <h3 className="font-bold text-lg text-slate-300">Advanced</h3>
                         <Toggle label="Developer Mode" checked={devMode} onChange={setDevMode} />
                         {devMode && <p className="text-xs text-amber-400 bg-amber-900/30 p-2 rounded-md">Dev Mode enabled. Image generation will be simulated to save API costs.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};