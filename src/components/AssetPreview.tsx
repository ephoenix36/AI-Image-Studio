
import React, { useState } from 'react';
import type { ReferenceAsset } from '@/types/types';
import { Icon } from '@/components/Icon';
import { ICONS } from '@/constants';

interface AssetPreviewProps {
    asset: ReferenceAsset;
    onClick: (asset: ReferenceAsset) => void;
    onRename: (asset: ReferenceAsset) => void;
    onDelete: (id: string) => void;
}

export const AssetPreview: React.FC<AssetPreviewProps> = ({ asset, onClick, onRename, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(asset.name);

    const handleRename = () => {
        if(name.trim() && name.trim() !== asset.name) {
            onRename({...asset, name: name.trim()});
        }
        setIsEditing(false);
    };

    return (
        <div className="flex items-center gap-2 p-1.5 bg-slate-700/50 rounded-md group hover:bg-slate-700 transition-colors">
            <div onClick={() => onClick(asset)} className="w-10 h-10 rounded-md bg-slate-900 flex-shrink-0 cursor-pointer">
                {asset.type === 'image' ? (
                    <img src={asset.previewUrl} alt={asset.name} className="w-full h-full object-cover rounded-md" />
                ) : (
                    <div className="flex items-center justify-center w-full h-full">
                        <Icon path={ICONS.FILE} className="w-6 h-6 text-slate-400" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        onBlur={handleRename}
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        className="w-full bg-slate-900 text-xs rounded border border-blue-500 px-1 py-0.5"
                        autoFocus
                    />
                ) : (
                    <p className="text-xs text-white truncate" onDoubleClick={() => setIsEditing(true)}>{asset.name}</p>
                )}
                <p className="text-xs text-slate-400">{asset.type}</p>
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => setIsEditing(true)} className="p-1 text-slate-400 hover:text-white"><Icon path={ICONS.EDIT} className="w-4 h-4"/></button>
                 <button onClick={() => onDelete(asset.id)} className="p-1 text-slate-400 hover:text-red-400"><Icon path={ICONS.TRASH} className="w-4 h-4"/></button>
            </div>
        </div>
    );
}
