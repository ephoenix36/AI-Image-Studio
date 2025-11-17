
import React from 'react';

interface LoadingAnimationProps {
    children?: React.ReactNode;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ children }) => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg overflow-hidden backdrop-blur-sm z-20">
        <div className="relative w-24 h-24">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 bg-slate-900 rounded-full"></div>
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">Generating</div>
        </div>
        {children}
    </div>
);
