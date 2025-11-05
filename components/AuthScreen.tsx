import React, { useState, useRef, useEffect } from 'react';
import { ConfirmationResult } from 'firebase/auth';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../styles/phone-input.css';
import { ICONS } from '../constants';
import { Icon } from './Icon';
import { useAuth } from '../contexts/AuthContext';
import { setupRecaptcha } from '../config/firebase';

type AuthMode = 'login' | 'signup' | 'phone';

export const AuthScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    
    const {
        signup,
        login,
        loginWithGoogle,
        loginWithPhone,
        verifyPhoneCode,
        sendVerificationEmail
    } = useAuth();

    useEffect(() => {
        // Cleanup function
        return () => {
            setError('');
            setSuccess('');
        };
    }, [mode]);

    const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (mode === 'signup') {
                if (!username.trim()) {
                    setError('Username is required');
                    setLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setLoading(false);
                    return;
                }
                
                await signup(email, password, username);
                setSuccess('Account created! Please check your email to verify your account.');
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (!phoneNumber) {
                setError('Please enter a phone number');
                setLoading(false);
                return;
            }

            const appVerifier = setupRecaptcha('recaptcha-container');
            const result = await loginWithPhone(phoneNumber, appVerifier);
            setConfirmationResult(result);
            setSuccess('Verification code sent to your phone!');
        } catch (err: any) {
            setError(err.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (!confirmationResult) {
                setError('Please request a verification code first');
                setLoading(false);
                return;
            }

            await verifyPhoneCode(confirmationResult, verificationCode);
        } catch (err: any) {
            setError(err.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const renderEmailPasswordForm = () => (
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
            {mode === 'signup' && (
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Choose a username"
                        required
                    />
                </div>
            )}
            
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                        <Icon name={showPassword ? ICONS.EYE_OFF : ICONS.EYE} size={20} />
                    </button>
                </div>
            </div>

            {mode === 'signup' && (
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                        required
                    />
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition"
            >
                {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
        </form>
    );

    const renderPhoneForm = () => (
        <form onSubmit={confirmationResult ? handleVerifyCode : handlePhoneSignIn} className="space-y-4">
            {!confirmationResult ? (
                <>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Phone Number
                        </label>
                        <PhoneInput
                            international
                            defaultCountry="US"
                            value={phoneNumber}
                            onChange={(value) => setPhoneNumber(value || '')}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 phone-input"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition"
                    >
                        {loading ? 'Sending...' : 'Send Verification Code'}
                    </button>
                </>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Verification Code
                        </label>
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="123456"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition"
                    >
                        {loading ? 'Verifying...' : 'Verify Code'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setConfirmationResult(null);
                            setVerificationCode('');
                        }}
                        className="w-full text-blue-400 hover:text-blue-300 text-sm"
                    >
                        Use a different number
                    </button>
                </>
            )}
        </form>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        AI Image Studio
                    </h1>
                    <p className="text-slate-400">
                        {mode === 'signup' ? 'Create your account' : mode === 'phone' ? 'Sign in with phone' : 'Welcome back'}
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8">
                    {/* Tab Selection */}
                    {mode !== 'phone' && (
                        <div className="flex gap-2 mb-6 bg-slate-700 p-1 rounded-lg">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
                                    mode === 'login'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMode('signup')}
                                className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
                                    mode === 'signup'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                Sign Up
                            </button>
                        </div>
                    )}

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500 rounded-lg text-green-500 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Forms */}
                    {mode === 'phone' ? renderPhoneForm() : renderEmailPasswordForm()}

                    {/* Divider */}
                    <div className="my-6 flex items-center">
                        <div className="flex-1 border-t border-slate-600"></div>
                        <span className="px-4 text-slate-400 text-sm">or</span>
                        <div className="flex-1 border-t border-slate-600"></div>
                    </div>

                    {/* Social/Alternative Sign In */}
                    {mode !== 'phone' && (
                        <>
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full bg-white hover:bg-gray-100 disabled:bg-slate-600 disabled:cursor-not-allowed text-gray-800 font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 mb-3"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Continue with Google
                            </button>

                            <button
                                onClick={() => setMode('phone')}
                                disabled={loading}
                                className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <Icon name={ICONS.PHONE} size={20} />
                                Continue with Phone
                            </button>
                        </>
                    )}

                    {mode === 'phone' && (
                        <button
                            onClick={() => {
                                setMode('login');
                                setConfirmationResult(null);
                                setVerificationCode('');
                                setPhoneNumber('');
                            }}
                            className="w-full text-blue-400 hover:text-blue-300 text-sm"
                        >
                            Back to email sign in
                        </button>
                    )}
                </div>

                {/* Terms/Privacy */}
                <p className="text-center text-slate-400 text-xs mt-6">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>

            {/* reCAPTCHA Container */}
            <div ref={recaptchaContainerRef} id="recaptcha-container"></div>
        </div>
    );
};
