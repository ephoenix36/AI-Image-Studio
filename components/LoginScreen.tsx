
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { Icon } from './Icon';
import type { User, Project, CustomPrompt } from '../types';

interface LoginScreenProps {
    onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const defaultPrompts: CustomPrompt[] = [
        { id: crypto.randomUUID(), name: "Clean Studio Shot", version: "1.0", text: "High-quality photo of [subject], clean white background, studio lighting", tags: ["studio", "product"], folderId: null, referenceAssetIds: [], createdAt: Date.now() },
        { id: crypto.randomUUID(), name: "Lifestyle Cafe Shot", version: "1.0", text: "Lifestyle shot of [subject] being used by a person in a modern cafe setting", tags: ["lifestyle", "cafe"], folderId: null, referenceAssetIds: [], createdAt: Date.now() },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError("Username and password are required.");
            return;
        }
        setError('');

        const savedUsers = localStorage.getItem('aiImageStudioUsers');
        const users: User[] = savedUsers ? JSON.parse(savedUsers) : [];
        const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (isRegistering) {
            if (existingUser) {
                setError("Username already exists. Please choose another or login.");
                return;
            }
            const firstProjectId = crypto.randomUUID();
            const defaultPromptFolderId = crypto.randomUUID();
            const defaultAssetFolderId = crypto.randomUUID();
            
            const firstProject: Project = {
                id: firstProjectId,
                name: 'My First Project',
                customPrompts: defaultPrompts.map(p => ({...p, folderId: defaultPromptFolderId})),
                generatedAssets: [],
                referenceAssets: [],
                folders: [
                    { id: defaultPromptFolderId, name: 'My Prompts', parentId: null, createdAt: Date.now(), type: 'prompt' },
                    { id: defaultAssetFolderId, name: 'Home', parentId: null, createdAt: Date.now(), type: 'asset' },
                ],
                createdAt: Date.now(),
            };

            const newUser: User = {
                username,
                password,
                projects: [firstProject],
                activeProjectId: firstProjectId,
                activePromptFolderId: defaultPromptFolderId,
                activeAssetFolderId: defaultAssetFolderId
            };
            
            onLogin(newUser);

        } else { // Logging in
            if (!existingUser) {
                setError("Username not found. Please register.");
                return;
            }
            if (existingUser.password !== password) {
                setError("Incorrect password.");
                return;
            }
            onLogin(existingUser);
        }
    };

    const handleGuestLogin = () => {
        const savedUsers = localStorage.getItem('aiImageStudioUsers');
        const users: User[] = savedUsers ? JSON.parse(savedUsers) : [];
        let guestUser = users.find(u => u.username === 'Guest');

        if (!guestUser) {
            const firstProjectId = crypto.randomUUID();
            const defaultPromptFolderId = crypto.randomUUID();
            const defaultAssetFolderId = crypto.randomUUID();
            
            const firstProject: Project = {
                id: firstProjectId,
                name: 'My First Project',
                customPrompts: defaultPrompts.map(p => ({...p, folderId: defaultPromptFolderId})),
                generatedAssets: [],
                referenceAssets: [],
                folders: [
                    { id: defaultPromptFolderId, name: 'My Prompts', parentId: null, createdAt: Date.now(), type: 'prompt' },
                    { id: defaultAssetFolderId, name: 'Home', parentId: null, createdAt: Date.now(), type: 'asset' },
                ],
                createdAt: Date.now(),
            };

            guestUser = {
                username: 'Guest',
                projects: [firstProject],
                activeProjectId: firstProjectId,
                activePromptFolderId: defaultPromptFolderId,
                activeAssetFolderId: defaultAssetFolderId
            };
        }
        
        onLogin(guestUser);
    };

    return (
        <div className="bg-slate-900 min-h-screen flex items-center justify-center p-4 bg-aurora">
             <style>{`.bg-aurora { background-color: #0f172a; background-image: radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 0.1) 0px, transparent 50%), radial-gradient(at 97% 21%, hsla(125, 98%, 72%, 0.1) 0px, transparent 50%), radial-gradient(at 52% 99%, hsla(355, 98%, 61%, 0.1) 0px, transparent 50%), radial-gradient(at 10% 29%, hsla(256, 96%, 67%, 0.1) 0px, transparent 50%), radial-gradient(at 97% 96%, hsla(38, 60%, 74%, 0.1) 0px, transparent 50%), radial-gradient(at 33% 50%, hsla(222, 67%, 73%, 0.1) 0px, transparent 50%), radial-gradient(at 79% 53%, hsla(343, 68%, 79%, 0.1) 0px, transparent 50%); }`}</style>
            <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-slate-700 text-center">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">Welcome!</h1>
                <p className="text-slate-400 mb-6">{isRegistering ? "Create an account to start." : "Enter your credentials to continue."}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full bg-slate-900/50 text-white text-center text-lg rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition px-4 py-3"
                        autoFocus
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-slate-900/50 text-white text-center text-lg rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 transition px-4 py-3"
                    />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button 
                        type="submit"
                        disabled={!username.trim() || !password.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-md transition text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icon path={ICONS.SPARKLES} />
                        {isRegistering ? 'Create Account' : 'Enter Studio'}
                    </button>
                </form>
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-slate-800/50 px-2 text-slate-400">or</span>
                    </div>
                </div>
                <button 
                    onClick={handleGuestLogin}
                    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-md transition text-lg"
                >
                    Continue as Guest
                </button>
                 <p className="text-slate-400 mt-6 text-sm">
                    {isRegistering ? "Already have an account?" : "Don't have an account?"}
                    <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="font-medium text-cyan-400 hover:text-cyan-300 ml-2">
                        {isRegistering ? 'Login' : 'Register'}
                    </button>
                </p>
            </div>
        </div>
    );
};