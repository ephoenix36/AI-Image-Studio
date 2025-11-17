
import React from 'react';

interface IconProps {
    path: string;
    className?: string;
}

export const Icon: React.FC<IconProps> = ({ path, className = "w-5 h-5" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d={path} />
    </svg>
);
