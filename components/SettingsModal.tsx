import React from 'react';
import { Icon } from './Icon';
import { ICONS, ASPECT_RATIOS } from '../constants';

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
    devMode, setDevMode, confirmOnDelete, setConfirmOnDelete
 }) => {
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