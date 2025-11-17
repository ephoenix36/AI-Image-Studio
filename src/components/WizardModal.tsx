
import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/Icon';
import { ICONS, WIZARD_SYSTEM_PROMPT } from '@/constants';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { generatePromptsWithAI } from '@/services/geminiService';
import type { CustomPrompt } from '@/types/types';
import { useBodyScrollLock } from '@/utils/utils';

interface WizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompts: string[], replace: boolean) => void;
    addNotification: (message: string, type?: 'info' | 'error') => void;
    devMode: boolean;
    existingPrompts: CustomPrompt[];
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

export const WizardModal: React.FC<WizardModalProps> = ({ isOpen, onClose, onGenerate, addNotification, devMode, existingPrompts }) => {
    useBodyScrollLock(isOpen);
    
    const [wizardInput, setWizardInput] = useState("A sleek, solar-powered watch with a leather strap.");
    const [wizardContext, setWizardContext] = useState("");
    const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
    const [numPrompts, setNumPrompts] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState(WIZARD_SYSTEM_PROMPT);
    const [showSystemPrompt, setShowSystemPrompt] = useState(false);
    const [replacePrompts, setReplacePrompts] = useState(false);
    const [showReferencePrompts, setShowReferencePrompts] = useState(false);
    const [promptSearchTerm, setPromptSearchTerm] = useState("");
    const [promptSortBy, setPromptSortBy] = useState<'name' | 'createdAt'>('createdAt');

    useEffect(() => {
        if (isOpen) {
            setShowSystemPrompt(false);
            setReplacePrompts(false);
            setSelectedPromptIds([]);
            setShowReferencePrompts(false);
            setPromptSearchTerm("");
        }
    }, [isOpen]);

    const hasChanges = wizardInput.trim() !== "A sleek, solar-powered watch with a leather strap." || 
                       wizardContext.trim() !== "" || 
                       selectedPromptIds.length > 0 ||
                       numPrompts !== 5;

    const handleClose = () => {
        if (hasChanges && !isGenerating) {
            const confirmClose = window.confirm("You have unsaved changes. Are you sure you want to close?");
            if (!confirmClose) return;
        }
        onClose();
    };

    const filteredAndSortedPrompts = existingPrompts
        .filter(p => 
            p.name.toLowerCase().includes(promptSearchTerm.toLowerCase()) ||
            p.text.toLowerCase().includes(promptSearchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (promptSortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            return b.createdAt - a.createdAt;
        });

    const handleGenerate = async () => {
        if (!wizardInput.trim()) {
            addNotification("Please describe your needs.", 'error');
            return;
        }
        setIsGenerating(true);
        addNotification('AI is crafting new prompts for you...');

        // Build context from selected prompts
        const selectedPromptsContext = selectedPromptIds.length > 0
            ? '\n\nExisting prompts for reference:\n' + selectedPromptIds.map(id => {
                const prompt = existingPrompts.find(p => p.id === id);
                return prompt ? `- ${prompt.text}` : '';
            }).filter(Boolean).join('\n')
            : '';

        const fullContext = wizardContext + selectedPromptsContext;

        if (devMode) {
            setTimeout(() => {
                const samplePrompts = [
                    "Simulated: A photorealistic product shot of [subject] on a plain white background.",
                    "Simulated: A lifestyle image of [subject] in a modern kitchen.",
                    "Simulated: An editorial flat lay of [subject] on a neutral gray surface.",
                    "Simulated: A vintage-style movie poster for [subject].",
                    "Simulated: A minimalist vector logo design for [subject].",
                    "Simulated: Corporate headshot of [subject], against a blurred modern office background.",
                    "Simulated: Full-body concept art of [subject], a rugged space explorer.",
                    "Simulated: 3D product render of [subject], a smart home device.",
                    "Simulated: A portrait of [subject], drawn in the beautiful and nostalgic style of Studio Ghibli.",
                    "Simulated: A cartoon drawing of [subject] in the style of 'South Park'."
                ];
                const prompts = Array.from({ length: numPrompts }, (_, i) => samplePrompts[i % samplePrompts.length]);
                onGenerate(prompts, replacePrompts);
                addNotification(`(Dev Mode) AI generated ${prompts.length} new prompts.`, 'info');
                onClose();
                setIsGenerating(false);
            }, 1500);
            return;
        }
        
        const result = await generatePromptsWithAI(wizardInput, fullContext, numPrompts);

        if (result.prompts && result.prompts.length > 0) {
            onGenerate(result.prompts, replacePrompts);
            addNotification(`AI generated ${result.prompts.length} new prompts.`, 'info');
            onClose();
        } else {
            addNotification(result.error || "The AI Wizard failed to generate prompts. Please try again.", 'error');
        }
        
        setIsGenerating(false);
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={handleClose}>
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-2xl relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {isGenerating && <LoadingAnimation />}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Icon path={ICONS.WAND}/> AI Prompt Wizard</h2>
                    <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto custom-scroll">
                    <div>
                        <label className="text-slate-300 mb-2 block font-medium">Your Goal or Request</label>
                        <textarea 
                            rows={3} 
                            value={wizardInput} 
                            onChange={(e) => setWizardInput(e.target.value)} 
                            className="w-full bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2" 
                            placeholder="e.g., A new line of eco-friendly coffee cups"
                        />
                    </div>
                     <div>
                        <label className="text-slate-300 mb-2 block font-medium">Instructions / Context (Optional)</label>
                        <textarea 
                            rows={4} 
                            value={wizardContext} 
                            onChange={(e) => setWizardContext(e.target.value)} 
                            className="w-full bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2" 
                            placeholder="Paste brand guidelines, product details, target audience, etc."
                        />
                    </div>
                    {existingPrompts.length > 0 && (
                        <details className="group/ref-prompts bg-slate-900/30 rounded-lg border border-slate-700" open={showReferencePrompts}>
                            <summary 
                                className="list-none cursor-pointer flex items-center justify-between p-3 font-medium text-slate-300 hover:text-white"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowReferencePrompts(!showReferencePrompts);
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <span>Reference Existing Prompts (Optional)</span>
                                    {selectedPromptIds.length > 0 && (
                                        <span className="text-xs bg-cyan-600 text-white px-2 py-1 rounded-full flex items-center justify-center">
                                            {selectedPromptIds.length}
                                        </span>
                                    )}
                                </div>
                                <Icon path={ICONS.CHEVRON_DOWN} className="w-5 h-5 transition-transform group-open/ref-prompts:rotate-180" />
                            </summary>
                            <div className="p-3 border-t border-slate-700 space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Search prompts..."
                                        value={promptSearchTerm}
                                        onChange={(e) => setPromptSearchTerm(e.target.value)}
                                        className="flex-1 bg-slate-900/50 text-white text-sm rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2"
                                    />
                                    <select
                                        value={promptSortBy}
                                        onChange={(e) => setPromptSortBy(e.target.value as 'name' | 'createdAt')}
                                        className="bg-slate-900/50 text-white text-sm rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2"
                                    >
                                        <option value="createdAt">Newest First</option>
                                        <option value="name">Name A-Z</option>
                                    </select>
                                    <button
                                        onClick={() => {
                                            if (selectedPromptIds.length === filteredAndSortedPrompts.length) {
                                                setSelectedPromptIds([]);
                                            } else {
                                                setSelectedPromptIds(filteredAndSortedPrompts.map(p => p.id));
                                            }
                                        }}
                                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-md transition whitespace-nowrap"
                                        title={selectedPromptIds.length === filteredAndSortedPrompts.length ? "Deselect All" : "Select All Filtered"}
                                    >
                                        <Icon path={selectedPromptIds.length === filteredAndSortedPrompts.length ? ICONS.CLOSE : ICONS.CHECK} className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto custom-scroll bg-slate-900/50 rounded-md border border-slate-700 p-2">
                                    {filteredAndSortedPrompts.length === 0 ? (
                                        <div className="text-sm text-slate-400 text-center py-4">No prompts found</div>
                                    ) : (
                                        filteredAndSortedPrompts.map(prompt => (
                                            <label key={prompt.id} className="flex items-start gap-2 p-2 hover:bg-slate-800/50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPromptIds.includes(prompt.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedPromptIds(prev => [...prev, prompt.id]);
                                                        } else {
                                                            setSelectedPromptIds(prev => prev.filter(id => id !== prompt.id));
                                                        }
                                                    }}
                                                    className="mt-1 rounded text-cyan-500 focus:ring-cyan-500"
                                                />
                                                <div className="flex-1 text-sm min-w-0">
                                                    <div className="text-white font-medium truncate">{prompt.name}</div>
                                                    <div className="text-slate-400 text-xs truncate">{prompt.text}</div>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                                {selectedPromptIds.length > 0 && (
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-cyan-400">{selectedPromptIds.length} prompt(s) selected as reference</div>
                                        <button
                                            onClick={() => setSelectedPromptIds([])}
                                            className="text-xs text-slate-400 hover:text-white underline"
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                )}
                            </div>
                        </details>
                    )}
                    <div className="flex items-center gap-6">
                        <div>
                            <label htmlFor="num-prompts" className="text-slate-300 mb-2 block font-medium">Number of Prompts</label>
                            <input 
                                id="num-prompts"
                                type="number"
                                value={numPrompts}
                                onChange={(e) => setNumPrompts(Math.max(1, parseInt(e.target.value, 10)))}
                                className="w-24 bg-slate-900/50 text-white rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition p-2"
                            />
                        </div>
                        <div className="border-l border-slate-700 pl-6">
                           <label className="text-slate-300 mb-2 block font-medium">Action</label>
                           <Toggle label="Replace existing custom prompts" checked={replacePrompts} onChange={setReplacePrompts} />
                        </div>
                    </div>
                     <div>
                        <button onClick={() => setShowSystemPrompt(p => !p)} className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                           <Icon path={ICONS.EDIT} className="w-4 h-4" /> Edit AI System Prompt
                        </button>
                        {showSystemPrompt && (
                             <textarea 
                                rows={8} 
                                value={systemPrompt} 
                                onChange={(e) => setSystemPrompt(e.target.value)} 
                                className="mt-2 w-full bg-slate-900/60 text-slate-300 text-xs rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition font-mono p-2"
                            />
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl flex-shrink-0">
                     <button onClick={handleGenerate} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-4 rounded-md transition disabled:bg-slate-500">
                        <Icon path={ICONS.SPARKLES} /> {isGenerating ? 'Generating...' : 'Generate Prompts'}
                    </button>
                </div>
            </div>
        </div>
    );
};
