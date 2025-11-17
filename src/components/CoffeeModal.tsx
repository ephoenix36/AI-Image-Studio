import React, { useEffect } from 'react';
import { Icon } from '@/components/Icon';
import { ICONS } from '@/constants';

interface CoffeeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CoffeeModal: React.FC<CoffeeModalProps> = ({ isOpen, onClose }) => {
    useEffect(() => {
        if (!isOpen) return;
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Icon path={ICONS.COFFEE} className="w-6 h-6 text-yellow-500" />
                        Support This Project
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scroll flex-1">
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
                            <h3 className="text-xl font-semibold text-white mb-3">👋 Hey there!</h3>
                            <div className="text-slate-300 space-y-3 leading-relaxed">
                                <p>
                                    I'm <span className="text-cyan-400 font-semibold">Enahm</span>, a passionate developer who believes in creating powerful, 
                                    accessible tools that empower creativity.
                                </p>
                                <p>
                                    <span className="text-white font-medium">AI Image Studio</span> was built with love during countless late nights 
                                    and weekends. It's designed to make AI-powered image generation intuitive, organized, and enjoyable—completely free 
                                    and open for everyone to use.
                                </p>
                                <p>
                                    Every feature you see, from the prompt wizard to the gallery organization, was crafted with one goal in mind: 
                                    <span className="text-cyan-400"> making your creative workflow effortless</span>.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg p-6 border border-yellow-500/30">
                            <h3 className="text-xl font-semibold text-white mb-3">☕ Why Support?</h3>
                            <div className="text-slate-300 space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="text-yellow-500">✓</span>
                                    <span>Keep the project <span className="text-white font-medium">free and open-source</span></span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-yellow-500">✓</span>
                                    <span>Fund new features and improvements</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-yellow-500">✓</span>
                                    <span>Support ongoing development and maintenance</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-yellow-500">✓</span>
                                    <span>Help cover API costs and hosting</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-slate-400 text-sm mb-4">
                                Your support, no matter how small, makes a huge difference! 🙏
                            </p>
                            
                            {/* Direct Buy Me a Coffee Button */}
                            <div className="flex flex-col gap-4 items-center">
                                <a 
                                    href="https://buymeacoffee.com/enahm" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-xl transition transform hover:scale-105 shadow-lg"
                                >
                                    <Icon path={ICONS.COFFEE} className="w-6 h-6" />
                                    <span className="text-lg">Buy Me a Coffee</span>
                                </a>
                                
                                <div className="flex gap-4 text-sm">
                                    <a 
                                        href="https://buymeacoffee.com/enahm" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-cyan-400 hover:text-cyan-300 underline"
                                    >
                                        One-time donation
                                    </a>
                                    <span className="text-slate-600">•</span>
                                    <a 
                                        href="https://buymeacoffee.com/enahm/membership" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-cyan-400 hover:text-cyan-300 underline"
                                    >
                                        Monthly support
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="text-center text-slate-400 text-sm">
                            <p>💙 Thank you for being part of this journey!</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
