import React from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'left' | 'right' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'left' }) => {
    const getPositionClasses = () => {
        switch (position) {
            case 'top':
                return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
            case 'bottom':
                return 'top-full left-1/2 -translate-x-1/2 mt-2';
            case 'right':
                return 'left-full top-1/2 -translate-y-1/2 ml-2';
            case 'left':
            default:
                return 'right-full top-1/2 -translate-y-1/2 mr-2';
        }
    };

    return (
      <div className="relative group flex items-center">
        {children}
        <div className={`absolute w-max bg-slate-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 shadow-lg border border-slate-700 ${getPositionClasses()}`}>
          {text}
        </div>
      </div>
    );
};
