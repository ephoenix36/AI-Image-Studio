
import React from 'react';
import type { Notification } from '@/types/types';

interface NotificationToastProps {
    notifications: Notification[];
    onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onDismiss }) => {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-4">
            {notifications.map(n => {
                const isError = n.type === 'error';
                return (
                    <div key={n.id} className={`max-w-sm w-full bg-slate-800 border-l-4 rounded-r-lg shadow-lg transition-all flex items-center gap-4 p-4 ${isError ? 'border-red-500' : 'border-green-500'}`}>
                        <span className="block sm:inline text-sm text-slate-200">{n.message}</span>
                        <button onClick={() => onDismiss(n.id)} className="ml-auto text-slate-400 hover:text-white text-xl leading-none">&times;</button>
                    </div>
                );
            })}
        </div>
    );
};
