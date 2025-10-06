
import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { ICONS, WIZARD_SYSTEM_PROMPT } from '../constants';
import { LoadingAnimation } from './LoadingAnimation';
import { generatePromptsWithAI } from '../services/geminiService';

interface WizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompts: string[], replace: boolean) => void;
    addNotification: (message: string, type?: 'info' | 'error') => void;
    devMode: boolean;
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

export const WizardModal: React.FC<WizardModalProps> = ({ isOpen, onClose, onGenerate, addNotification, devMode }) => {
    const [wizardInput, setWizardInput] = useState("A sleek, solar-powered watch with a leather strap.");
    const [wizardContext, setWizardContext] = useState("");
    const [numPrompts, setNumPrompts] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState(WIZARD_SYSTEM_PROMPT);
    const [showSystemPrompt, setShowSystemPrompt] = useState(false);
    const [replacePrompts, setReplacePrompts] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowSystemPrompt(false);
            setReplacePrompts(false);
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!wizardInput.trim()) {
            addNotification("Please describe your needs.", 'error');
            return;
        }
        setIsGenerating(true);
        addNotification('AI is crafting new prompts for you...');

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
        
        const result = await generatePromptsWithAI(wizardInput, wizardContext, numPrompts);

        if (result.prompts && result.prompts.length > 0) {
            onGenerate(result.prompts, replacePrompts);
            addNotification(`AI generated ${result.prompts.length} new prompts.`, 'info');
            onClose();
        } else {
            addNotification(result.error || "The AI Wizard failed to generate prompts. Please try again.", 'error');
        }
        
        setIsGenerating(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-2xl relative max-h-[90vh] flex flex-col">
                {isGenerating && <LoadingAnimation />}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Icon path={ICONS.WAND}/> AI Prompt Wizard</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
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
