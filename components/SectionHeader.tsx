import React from 'react';
import { Icon } from './Icon';
import { ICONS } from '../constants';

interface SectionHeaderProps {
    title: string;
    description?: string;
    onSelectAll: () => void;
    isCollapsed: boolean;
    categoryPromptIds: string[];
    selectedPrompts: string[];
    isBatchMode: boolean;
    onGenerateSelected: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, onSelectAll, isCollapsed, categoryPromptIds, selectedPrompts, isBatchMode, onGenerateSelected }) => {
    const selectionCount = categoryPromptIds.filter(id => selectedPrompts.includes(id)).length;
    const selectionState = selectionCount === 0 ? 'none' : (selectionCount === categoryPromptIds.length ? 'all' : 'some');
    
    const getSelectAllClasses = () => {
        switch (selectionState) {
            case 'all': return 'bg-orange-600 hover:bg-orange-500 text-white';
            case 'some': return 'bg-slate-600 hover:bg-slate-500 text-orange-300 ring-1 ring-orange-500';
            default: return 'bg-slate-700 hover:bg-slate-600 text-slate-300';
        }
    };

    return (
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
            <div className="flex items-center gap-2">
                <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-white">{title}</h2>
                    {description && <p className="text-slate-400 mt-1 text-sm sm:text-base">{description}</p>}
                </div>
            </div>
            <div className="flex items-center gap-4">
                {isBatchMode && !isCollapsed && (
                    <div className="flex items-center gap-2 self-center">
                         <button onClick={onGenerateSelected} disabled={selectionCount === 0} className={`text-sm font-semibold py-1.5 px-3 rounded-md transition flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed`}>
                            <Icon path={ICONS.SPARKLES} className="w-4 h-4" />
                            Generate Selected ({selectionCount})
                        </button>
                        <button onClick={onSelectAll} className={`text-sm font-semibold py-1.5 px-3 rounded-md transition ${getSelectAllClasses()}`}>
                            {selectionState === 'all' ? 'Deselect All' : `Select All`}
                        </button>
                    </div>
                )}
                 <div className="text-slate-400 p-1">
                    <Icon path={ICONS.CHEVRON_UP} className={`w-7 h-7 transition-transform ${!isCollapsed ? 'rotate-180' : ''}`} />
                </div>
            </div>
        </div>
    );
};