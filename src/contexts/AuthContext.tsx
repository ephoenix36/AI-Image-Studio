import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  updateProfile,
  PhoneAuthProvider,
  signInWithCredential,
  ConfirmationResult,
  signInWithPhoneNumber,
  signInAnonymously,
  RecaptchaVerifier,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db, setupRecaptcha } from '@/config/firebase';
import type { User } from '@/types/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signup: (email: string, password: string, username: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  loginWithPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateUserData: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createDefaultUserData = (firebaseUser: FirebaseUser, username: string): User => {
    const firstProjectId = crypto.randomUUID();
    const defaultPromptFolderId = crypto.randomUUID();
    const defaultAssetFolderId = crypto.randomUUID();

    return {
      username: username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      projects: [
        {
          id: firstProjectId,
          name: 'My First Project',
          customPrompts: [],
          generatedAssets: [],
          referenceAssets: [],
          folders: [
            { id: defaultPromptFolderId, name: 'My Prompts', parentId: null, createdAt: Date.now(), type: 'prompt' },
            { id: defaultAssetFolderId, name: 'Home', parentId: null, createdAt: Date.now(), type: 'asset' },
          ],
          createdAt: Date.now(),
        }
      ],
      activeProjectId: firstProjectId,
      activePromptFolderId: defaultPromptFolderId,
      activeAssetFolderId: defaultAssetFolderId,
    };
  };

  const signup = async (email: string, password: string, username: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: username });

    // Create user data in Firestore
    const newUserData = createDefaultUserData(user, username);
    await setDoc(doc(db, 'users', user.uid), newUserData);
    setUserData(newUserData);

    // Send email verification
    await sendEmailVerification(user);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user data exists in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create new user data for first-time Google login
      const newUserData = createDefaultUserData(user, user.displayName || '');
      await setDoc(userDocRef, newUserData);
      setUserData(newUserData);
    }
  };

  const loginAnonymously = async () => {
    const result = await signInAnonymously(auth);
    const user = result.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const guestName = `Guest-${user.uid.slice(0, 6)}`;
      const newUserData = createDefaultUserData(user, guestName);
      await setDoc(userDocRef, newUserData);
      setUserData(newUserData);
    }
  };

  const loginWithPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  };

  const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    const result = await confirmationResult.confirm(code);
    const user = result.user;

    // Check if user data exists in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create new user data for first-time phone login
      const newUserData = createDefaultUserData(user, user.phoneNumber || 'User');
      await setDoc(userDocRef, newUserData);
      setUserData(newUserData);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
  };

  const sendVerificationEmail = async () => {
    if (currentUser) {
      await sendEmailVerification(currentUser);
    }
  };

  const updateUserData = async (data: Partial<User>) => {
    if (currentUser && userData) {
      const updatedData = { ...userData, ...data };
      await setDoc(doc(db, 'users', currentUser.uid), updatedData);
      setUserData(updatedData);
    }
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    loginWithGoogle,
    loginAnonymously,
    loginWithPhone,
    verifyPhoneCode,
    logout,
    sendVerificationEmail,
    updateUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
