# Copilot Instructions for AI Image Studio

## 🎯 Project Context

### What This Project Does
AI Image Studio is a **powerful AI-powered image generation and management platform** that combines Google's Gemini AI with a sophisticated project organization system. Users can generate high-quality images from text prompts, manage reference materials, organize work into projects with folder structures, and sync everything to the cloud with Firebase authentication.

### Core Technologies
- **Frontend:** React 19, TypeScript 5.8, Vite 6.2
- **AI Generation:** Google Gemini API (`@google/genai` 1.21.0)
- **Authentication:** Firebase Authentication (Email/Password, Google OAuth, Phone/SMS)
- **Database:** Cloud Firestore (user data, projects, assets)
- **Build Tool:** Vite with React plugin
- **Styling:** Inline styles with Tailwind-inspired utility patterns
- **Phone Input:** react-phone-number-input 3.4.13

### Architecture Overview
```
┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React App      │────▶│  Firebase Auth   │────▶│  Firestore DB   │
│   (Studio.tsx)   │◀────│  (AuthContext)   │◀────│  (User Data)    │
└──────────────────┘     └──────────────────┘     └─────────────────┘
        │                         
        ├──────────────▶ Gemini API (Image Generation)
        │
        └──────────────▶ Firebase Storage (Future: Cloud Images)
```

**Application Flow:**
1. User authenticates via Firebase (Email/Google/Phone)
2. User data loads from Firestore (projects, prompts, assets)
3. User creates/edits prompts with reference images and tags
4. Gemini API generates images based on prompts
5. Generated images stored locally (base64) and synced to Firestore
6. Folder-based organization for both prompts and assets

---

## 🏗️ Code Standards

### TypeScript/React

**Naming Conventions:**
- **Files:** `PascalCase.tsx` for components, `camelCase.ts` for utilities
  - Examples: `Studio.tsx`, `AuthScreen.tsx`, `geminiService.ts`, `utils.ts`
- **Components:** `PascalCase` (e.g., `ImageViewer`, `PromptCard`, `FolderTree`)
- **Functions:** `camelCase` (e.g., `generateImage`, `blobToBase64`, `sanitizeFilename`)
- **Constants:** `SCREAMING_SNAKE_CASE` or `PascalCase` for complex objects
  - Examples: `ASPECT_RATIOS`, `MEDIA_CATEGORIES`, `WIZARD_SYSTEM_PROMPT`
- **Types/Interfaces:** `PascalCase` (e.g., `GeneratedAsset`, `CustomPrompt`, `User`)

**Patterns We Use:**

```typescript
// ✅ Functional components with explicit prop types
interface ImageViewerProps {
  asset: GeneratedAsset;
  onClose: () => void;
  onEdit?: (asset: GeneratedAsset) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ 
  asset, 
  onClose, 
  onEdit 
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  
  return (
    <div className="image-viewer">
      {/* Implementation */}
    </div>
  );
};

// ✅ Custom hooks for reusable logic
export function useUndoableState<T>(
  initialState: T
): [T, (value: T | ((prev: T) => T)) => void, () => void, () => void, boolean, boolean] {
  const [state, dispatch] = useReducer(undoReducer, {
    history: [initialState],
    currentIndex: 0
  });
  
  const setState = useCallback((value: T | ((prev: T) => T)) => {
    if (typeof value === 'function') {
      dispatch({ type: 'SET_FUNCTION', updater: value as (prev: T) => T });
    } else {
      dispatch({ type: 'SET', payload: value });
    }
  }, []);
  
  return [state.history[state.currentIndex], setState, undo, redo, canUndo, canRedo];
}

// ✅ Context for global state
interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signup: (email: string, password: string, username: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ✅ TypeScript for all props and state
interface LoadingState {
  isLoading: boolean;
  controller: AbortController;
}

const [loadingState, setLoadingState] = useState<LoadingState>({
  isLoading: false,
  controller: new AbortController()
});

// ✅ Explicit types for complex data structures
export interface GeneratedAsset {
  id: string;
  imageUrl: string;
  prompt: string;
  promptId: string;
  subject: string;
  name: string;
  createdAt: number;
  editedFromId?: string;
  aspectRatio: string;
  tags: string[];
  folderId: string | null;
  resolution?: { width: number; height: number };
  referenceAssetIds?: string[];
}
```

**Anti-Patterns to Avoid:**

```typescript
// ❌ Avoid any types (use proper TypeScript)
function processData(data: any) {}

// ❌ Don't mutate state directly
assets.push(newAsset);  // Wrong!
setAssets(assets);      // Wrong!

// ✅ Use immutable updates
setAssets([...assets, newAsset]);
setAssets(prev => [...prev, newAsset]);

// ❌ Don't forget cleanup for side effects
useEffect(() => {
  const eventSource = new EventSource(url);
  // Missing cleanup!
}, []);

// ✅ Always return cleanup functions
useEffect(() => {
  const controller = new AbortController();
  
  fetchData(controller.signal);
  
  return () => controller.abort();  // Cleanup
}, []);

// ❌ Avoid deeply nested ternaries
const display = loading ? 'Loading...' : (error ? 'Error' : (data ? data.value : 'No data'));

// ✅ Use clear conditional logic
const getDisplay = () => {
  if (loading) return 'Loading...';
  if (error) return 'Error';
  if (!data) return 'No data';
  return data.value;
};
```

### Firebase & Cloud Firestore

**Patterns We Use:**

```typescript
// ✅ Proper Firebase initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ... other config
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ✅ Firestore data operations
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Save user data
const userRef = doc(db, 'users', userId);
await setDoc(userRef, userData, { merge: true });

// Load user data
const userDoc = await getDoc(userRef);
if (userDoc.exists()) {
  const data = userDoc.data() as User;
}

// Update specific fields
await updateDoc(userRef, {
  'projects': updatedProjects,
  'activeProjectId': newProjectId
});

// ✅ Auth state management
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    setCurrentUser(user);
    
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as User);
      }
    } else {
      setUserData(null);
    }
    
    setLoading(false);
  });
  
  return unsubscribe;  // Cleanup subscription
}, []);
```

---

## 🧩 Common Patterns

### Image Generation with Gemini

```typescript
// Primary image generation flow
export async function generateImage(
  prompt: string,
  referenceImages: ReferenceImage[],
  aspectRatio: string,
  signal: AbortSignal
): Promise<{ imageUrl?: string; error?: string }> {
  try {
    // Check for abort before starting
    if (signal.aborted) {
      throw new DOMException('Aborted by user', 'AbortError');
    }

    // With reference images: use image generation model
    if (referenceImages.length > 0) {
      const imageParts = referenceImages.map(img => ({
        inlineData: { data: img.base64, mimeType: img.mimeType }
      }));

      const response = await withAbort(
        ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              ...imageParts,
              { text: `Using the reference images, generate: "${prompt}"` }
            ]
          }
        }),
        signal
      );

      // Extract image from response
      const imageData = response.candidates[0].content.parts
        .find(part => part.inlineData)?.inlineData;
      
      if (imageData) {
        return { imageUrl: `data:${imageData.mimeType};base64,${imageData.data}` };
      }
    } 
    
    // Without reference images: use text-to-image API
    else {
      const response = await withAbort(
        ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio as any
          }
        }),
        signal
      );

      if (response.images?.[0]?.image) {
        const imageData = response.images[0].image;
        return { imageUrl: `data:${imageData.mimeType};base64,${imageData.bytesBase64Encoded}` };
      }
    }

    return { error: 'No image generated' };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { error: 'Generation cancelled' };
    }
    return { error: error.message || 'Generation failed' };
  }
}

// Abort-aware promise wrapper
async function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abortHandler = () => {
      reject(new DOMException('Aborted by user', 'AbortError'));
    };

    signal.addEventListener('abort', abortHandler, { once: true });

    promise
      .then(result => {
        signal.removeEventListener('abort', abortHandler);
        resolve(result);
      })
      .catch(error => {
        signal.removeEventListener('abort', abortHandler);
        reject(error);
      });
  });
}
```

### Folder-Based Organization

```typescript
// Folder tree structure for organizing prompts and assets
interface Folder {
  id: string;
  name: string;
  parentId: string | null;  // null = root level
  type: 'prompt' | 'asset';  // Different folder types
  createdAt: number;
}

// Get folder breadcrumbs for navigation
const getBreadcrumbs = (folderId: string | null, folders: Folder[]): Folder[] => {
  if (!folderId) return [];
  
  const breadcrumbs: Folder[] = [];
  let currentId: string | null = folderId;
  
  while (currentId) {
    const folder = folders.find(f => f.id === currentId);
    if (!folder) break;
    
    breadcrumbs.unshift(folder);
    currentId = folder.parentId;
  }
  
  return breadcrumbs;
};

// Folder tree component pattern
export const FolderTree: React.FC<{
  folders: Folder[];
  activeFolderId: string | null;
  onFolderClick: (folderId: string | null) => void;
  onFolderCreate: (name: string, parentId: string | null) => void;
  onFolderRename: (folderId: string, newName: string) => void;
  onFolderDelete: (folderId: string) => void;
}> = ({ folders, activeFolderId, onFolderClick, ... }) => {
  const rootFolders = folders.filter(f => f.parentId === null);
  
  return (
    <div className="folder-tree">
      <FolderItem
        folder={null}  // Root/Home
        isActive={activeFolderId === null}
        onClick={() => onFolderClick(null)}
      />
      {rootFolders.map(folder => (
        <FolderNode
          key={folder.id}
          folder={folder}
          folders={folders}
          activeFolderId={activeFolderId}
          onFolderClick={onFolderClick}
        />
      ))}
    </div>
  );
};
```

### Custom Prompt Management with Version History

```typescript
// Prompts track version history for iterative improvement
interface CustomPrompt {
  id: string;
  name: string;
  version: string;  // e.g., "v1.0", "v1.1"
  text: string;
  tags: string[];
  folderId: string | null;
  referenceAssetIds: string[];
  aspectRatio?: string;
  createdAt: number;
  history?: CustomPromptHistory[];  // Track changes
}

interface CustomPromptHistory {
  version: string;
  text: string;
  tags: string[];
  referenceAssetIds: string[];
  aspectRatio?: string;
  createdAt: number;
}

// Save new version when prompt is edited
const updatePromptWithHistory = (
  prompt: CustomPrompt,
  newText: string,
  newTags: string[]
): CustomPrompt => {
  // Create history entry from current version
  const historyEntry: CustomPromptHistory = {
    version: prompt.version,
    text: prompt.text,
    tags: prompt.tags,
    referenceAssetIds: prompt.referenceAssetIds,
    aspectRatio: prompt.aspectRatio,
    createdAt: prompt.createdAt
  };

  // Increment version (v1.0 -> v1.1)
  const [major, minor] = prompt.version.replace('v', '').split('.').map(Number);
  const newVersion = `v${major}.${minor + 1}`;

  return {
    ...prompt,
    version: newVersion,
    text: newText,
    tags: newTags,
    createdAt: Date.now(),
    history: [...(prompt.history || []), historyEntry]
  };
};
```

### Undo/Redo Pattern

```typescript
// Custom hook for undoable state (used for prompt editing)
export function useUndoableState<T>(initialState: T) {
  type Action = 
    | { type: 'SET'; payload: T }
    | { type: 'SET_FUNCTION'; updater: (prev: T) => T }
    | { type: 'UNDO' }
    | { type: 'REDO' };

  type State = {
    history: T[];
    currentIndex: number;
  };

  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case 'SET': {
        const newHistory = state.history.slice(0, state.currentIndex + 1);
        return {
          history: [...newHistory, action.payload],
          currentIndex: newHistory.length
        };
      }
      
      case 'UNDO': {
        if (state.currentIndex > 0) {
          return { ...state, currentIndex: state.currentIndex - 1 };
        }
        return state;
      }
      
      case 'REDO': {
        if (state.currentIndex < state.history.length - 1) {
          return { ...state, currentIndex: state.currentIndex + 1 };
        }
        return state;
      }
      
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, {
    history: [initialState],
    currentIndex: 0
  });

  const setState = useCallback((value: T | ((prev: T) => T)) => {
    if (typeof value === 'function') {
      dispatch({ type: 'SET_FUNCTION', updater: value as (prev: T) => T });
    } else {
      dispatch({ type: 'SET', payload: value });
    }
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const canUndo = state.currentIndex > 0;
  const canRedo = state.currentIndex < state.history.length - 1;

  return [
    state.history[state.currentIndex],
    setState,
    undo,
    redo,
    canUndo,
    canRedo
  ] as const;
}
```

### Modal & Body Scroll Lock

```typescript
// Prevent body scrolling when modals are open
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isLocked]);
}

// Modal component pattern
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  useBodyScrollLock(isOpen);
  
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}  // Prevent close on content click
      >
        {children}
      </div>
    </div>
  );
};
```

---

## 🎨 UI/UX Guidelines

### Component Organization

The app follows a **hierarchical component structure**:

```
Studio.tsx (Main App Container)
├── AuthScreen.tsx (if not authenticated)
└── Main Application (if authenticated)
    ├── Header
    │   ├── Logo
    │   ├── Project Selector
    │   └── Settings/Logout
    ├── Sidebar
    │   ├── Media Type Selector
    │   ├── Category Browser
    │   └── Prompt Library
    ├── Main Content
    │   ├── Prompt Editor
    │   │   ├── Subject Input
    │   │   ├── Description Input
    │   │   ├── Reference Assets
    │   │   ├── Aspect Ratio Selector
    │   │   └── Generate Button
    │   └── PhotoGallery (Generated Assets)
    └── Modals (Portal rendered)
        ├── ImageViewer
        ├── ImageEditorModal
        ├── WizardModal
        ├── SettingsModal
        ├── ReferenceAssetSelectorModal
        └── BatchEditorModal
```

### Styling Approach

**Current Pattern:** Inline styles with Tailwind-inspired utilities

```typescript
// ✅ Consistent styling patterns
<div style={{
  backgroundColor: '#1e293b',  // slate-800
  borderRadius: '1rem',         // rounded-2xl
  padding: '1.5rem',            // p-6
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  border: '1px solid #334155'   // border-slate-700
}}>
  {/* Content */}
</div>

// Common color palette:
// - Primary background: #0f172a (slate-900)
// - Secondary background: #1e293b (slate-800)
// - Tertiary background: #334155 (slate-700)
// - Border: #475569 (slate-600)
// - Text primary: #ffffff (white)
// - Text secondary: #cbd5e1 (slate-300)
// - Accent: #3b82f6 (blue-500)
// - Danger: #ef4444 (red-500)
// - Success: #10b981 (green-500)

// ✅ Reusable button patterns
const buttonStyles = {
  base: {
    fontWeight: 'bold',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: 'none'
  },
  primary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    ':hover': { backgroundColor: '#2563eb' }
  },
  secondary: {
    backgroundColor: '#475569',
    color: 'white',
    ':hover': { backgroundColor: '#334155' }
  },
  danger: {
    backgroundColor: '#ef4444',
    color: 'white',
    ':hover': { backgroundColor: '#dc2626' }
  }
};
```

### Responsive Design

```typescript
// ✅ Mobile-first responsive patterns
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
  gap: '1rem',
  padding: '1rem'
}}>
  {/* Auto-responsive grid */}
</div>

// ✅ Conditional layout based on screen size
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

return (
  <div style={{
    flexDirection: isMobile ? 'column' : 'row',
    padding: isMobile ? '0.5rem' : '1.5rem'
  }}>
    {/* Layout adapts */}
  </div>
);
```

### Icons & Tooltips

```typescript
// Icon component for consistent iconography
export const Icon: React.FC<{ icon: string; size?: number }> = ({ 
  icon, 
  size = 20 
}) => {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: `${size}px`,
      lineHeight: 1
    }}>
      {icon}
    </span>
  );
};

// Tooltip pattern for helpful hints
export const Tooltip: React.FC<{
  text: string;
  children: React.ReactNode;
}> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1e293b',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          marginBottom: '0.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          {text}
        </div>
      )}
    </div>
  );
};
```

---

## 🔒 Security & Best Practices

### Environment Variables

```typescript
// ✅ Never commit secrets
// Use .env files (excluded in .gitignore)

// .env.example (committed)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id
GEMINI_API_KEY=your_gemini_key_here

// Access in code
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

// Validate required variables at startup
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  throw new Error('Missing required environment variable: VITE_FIREBASE_API_KEY');
}
```

### Firebase Security Rules

```javascript
// Firestore security rules (firestore.rules)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Prevent unauthorized access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Input Sanitization

```typescript
// ✅ Sanitize filenames for download/storage
export function sanitizeFilename(text: string): string {
  if (!text) return `untitled_${Date.now()}`;
  
  // Replace non-alphanumeric characters
  const sanitized = text
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');  // Collapse multiple underscores
  
  // Limit length
  return sanitized.substring(0, 100);
}

// ✅ Validate prompt input
const validatePrompt = (text: string): string | null => {
  if (!text.trim()) {
    return 'Prompt cannot be empty';
  }
  
  if (text.length > 2000) {
    return 'Prompt is too long (max 2000 characters)';
  }
  
  return null;  // Valid
};
```

### Error Handling

```typescript
// ✅ Comprehensive error handling
const handleGeneration = async () => {
  const controller = new AbortController();
  setLoadingState({ isLoading: true, controller });
  
  try {
    const result = await generateImage(
      prompt,
      referenceImages,
      aspectRatio,
      controller.signal
    );
    
    if (result.error) {
      // User-friendly error message
      showNotification({
        id: Date.now().toString(),
        message: `Generation failed: ${result.error}`,
        type: 'error'
      });
      return;
    }
    
    // Success - save asset
    const newAsset: GeneratedAsset = {
      id: crypto.randomUUID(),
      imageUrl: result.imageUrl!,
      prompt,
      // ... other fields
    };
    
    setAssets(prev => [newAsset, ...prev]);
    showNotification({
      id: Date.now().toString(),
      message: 'Image generated successfully!',
      type: 'info'
    });
    
  } catch (error) {
    if (error.name === 'AbortError') {
      showNotification({
        id: Date.now().toString(),
        message: 'Generation cancelled',
        type: 'info'
      });
    } else {
      console.error('Generation error:', error);
      showNotification({
        id: Date.now().toString(),
        message: 'An unexpected error occurred',
        type: 'error'
      });
    }
  } finally {
    setLoadingState({ isLoading: false, controller: new AbortController() });
  }
};
```

---

## 🧪 Testing Considerations

### Manual Testing Checklist

Since this project uses manual testing, here's what to verify:

**Authentication Flow:**
- [ ] Email/password signup with verification
- [ ] Email/password login
- [ ] Google OAuth login
- [ ] Phone/SMS authentication
- [ ] Logout and session persistence
- [ ] Error handling for invalid credentials

**Image Generation:**
- [ ] Generate image from text prompt only
- [ ] Generate with reference images
- [ ] Test different aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4)
- [ ] Cancel generation mid-process
- [ ] Handle API errors gracefully
- [ ] Verify generated images save to project

**Project Management:**
- [ ] Create new project
- [ ] Switch between projects
- [ ] Rename project
- [ ] Delete project (with confirmation)
- [ ] Verify data isolation between projects

**Folder Organization:**
- [ ] Create prompt folders
- [ ] Create asset folders
- [ ] Move items between folders
- [ ] Rename folders
- [ ] Delete folders (verify items move to root)
- [ ] Navigate folder hierarchy

**Prompt Library:**
- [ ] Save custom prompt
- [ ] Edit prompt (version history)
- [ ] Delete prompt
- [ ] Tag prompts for organization
- [ ] Filter prompts by tags
- [ ] Load prompt template into editor

**Asset Management:**
- [ ] View generated asset in gallery
- [ ] Open asset in full-screen viewer
- [ ] Edit asset (prompts to regenerate variation)
- [ ] Download asset
- [ ] Delete asset
- [ ] Batch operations (select multiple)

**Data Sync:**
- [ ] Create data on device A, verify appears on device B
- [ ] Edit data on device B, verify updates on device A
- [ ] Test offline behavior (graceful degradation)
- [ ] Verify Firestore limits not exceeded

---

## 📐 Project Structure

```
AI-Image-Studio/
├── .github/
│   └── copilot-instructions.md     # This file
├── .vscode/
│   └── settings.json               # VS Code workspace settings
├── components/                     # React components
│   ├── AssetPreview.tsx           # Asset display component
│   ├── AuthScreen.tsx             # Login/signup UI
│   ├── BatchEditorModal.tsx       # Batch operations UI
│   ├── CoffeeModal.tsx            # Support/donation modal
│   ├── FolderTree.tsx             # Folder navigation tree
│   ├── Icon.tsx                   # Icon wrapper component
│   ├── ImageEditorModal.tsx       # Image editing interface
│   ├── ImageViewer.tsx            # Full-screen image viewer
│   ├── LoadingAnimation.tsx       # Loading spinner
│   ├── LoginScreen.tsx            # Legacy login component
│   ├── NotificationToast.tsx      # Toast notifications
│   ├── PhotoGallery.tsx           # Asset grid display
│   ├── PromptCard.tsx             # Prompt template card
│   ├── ReferenceAssetSelectorModal.tsx  # Reference picker
│   ├── SectionHeader.tsx          # Section title component
│   ├── SettingsModal.tsx          # App settings
│   ├── Tooltip.tsx                # Tooltip component
│   └── WizardModal.tsx            # Guided prompt creation
├── config/
│   └── firebase.ts                # Firebase initialization
├── contexts/
│   └── AuthContext.tsx            # Authentication context
├── services/
│   └── geminiService.ts           # Gemini API integration
├── styles/
│   └── phone-input.css            # Phone input styling
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── App.tsx                        # Legacy app entry (deprecated)
├── AUTH_README.md                 # Authentication documentation
├── constants.ts                   # App constants & prompts
├── FIREBASE_SETUP.md              # Firebase setup guide
├── IMPLEMENTATION_SUMMARY.md      # Feature implementation notes
├── index.html                     # HTML entry point
├── index.tsx                      # React entry point
├── metadata.json                  # App metadata
├── MIGRATION_GUIDE.md             # Migration documentation
├── package.json                   # Dependencies
├── README.md                      # Main documentation
├── setup-firebase.ps1             # PowerShell setup script
├── SETUP_CHECKLIST.md             # Setup checklist
├── Studio.tsx                     # Main application component
├── tsconfig.json                  # TypeScript configuration
├── types.ts                       # TypeScript type definitions
├── utils.ts                       # Utility functions
├── vite-env.d.ts                  # Vite environment types
├── vite.config.ts                 # Vite build configuration
└── yarn.lock                      # Dependency lock file
```

---

## 🚀 Development Workflow

### Setup & Installation

```powershell
# Clone and setup
cd AI-Image-Studio

# Install dependencies
yarn install
# or
npm install

# Copy environment template
cp .env.example .env

# Configure Firebase (see FIREBASE_SETUP.md)
# Edit .env with your Firebase credentials

# Run development server
yarn dev
# or
npm run dev

# App available at http://localhost:3000
```

### Before Committing

```powershell
# Build to check for TypeScript errors
yarn build

# Manual testing of affected features
# See "Testing Considerations" section

# Review changes
git diff

# Commit with clear message
git add .
git commit -m "feat: Add batch asset deletion"
```

### PR/Commit Message Conventions

```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting)
refactor: Code refactoring
perf: Performance improvements
test: Test additions/changes
chore: Build process, dependencies
```

---

## 🐛 Known Issues & Gotchas

### Firebase Rate Limits

**Issue:** Firestore has generous but finite quotas
```typescript
// ✅ Batch writes when possible
import { writeBatch } from 'firebase/firestore';

const batch = writeBatch(db);
assets.forEach(asset => {
  const ref = doc(db, 'users', userId, 'assets', asset.id);
  batch.set(ref, asset);
});
await batch.commit();  // Single network request
```

### Base64 Image Size

**Issue:** Large base64 strings can impact performance
```typescript
// ⚠️ Base64 increases size by ~33%
// A 1MB image becomes ~1.3MB in base64

// Consider: Move to Firebase Storage for large images
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function uploadImage(imageBlob: Blob, userId: string): Promise<string> {
  const storageRef = ref(storage, `users/${userId}/images/${Date.now()}.png`);
  await uploadBytes(storageRef, imageBlob);
  return await getDownloadURL(storageRef);
}
```

### React 19 Changes

**Issue:** React 19 has breaking changes from 18
```typescript
// ✅ React 19 compatible patterns
import { use } from 'react';  // New in React 19

// Old pattern (React 18)
const data = React.use(promise);  // ❌ May not work

// New pattern (React 19)
const data = use(promise);  // ✅ Correct
```

### Vite Environment Variables

**Issue:** Only `VITE_*` prefixed vars are exposed to client
```typescript
// ❌ Not accessible in client code
const key = import.meta.env.GEMINI_API_KEY;

// ✅ Accessible in client code
const key = import.meta.env.VITE_FIREBASE_API_KEY;

// ⚠️ Exception: API keys processed in vite.config.ts
// See vite.config.ts define section for GEMINI_API_KEY handling
```

---

## 📚 Key Files Explained

### Studio.tsx
The main application component. Contains:
- Project management state
- Prompt editor logic
- Asset gallery rendering
- Modal orchestration
- Firebase sync logic

### AuthContext.tsx
Authentication provider with:
- Firebase Auth integration
- User session management
- Login/signup methods
- User data CRUD operations

### geminiService.ts
Gemini API integration:
- Text-to-image generation
- Image-to-image with references
- Abort controller support
- Error handling

### types.ts
TypeScript type definitions for:
- User data structure
- Project schema
- Asset types (generated, reference)
- Prompt structure with history
- Folder organization

### constants.ts
Application constants:
- Media categories with prompt templates
- Aspect ratio options
- Icon mappings
- Default descriptions per media type
- Wizard system prompts

### utils.ts
Utility functions:
- `blobToBase64`: Convert blobs for storage
- `sanitizeFilename`: Clean filenames for download
- `useUndoableState`: Undo/redo hook
- `useBodyScrollLock`: Modal scroll prevention
- `getResolution`: Extract image dimensions

---

## 🤝 Getting Help

**Documentation:**
- [Firebase Setup](./FIREBASE_SETUP.md) - Complete Firebase configuration guide
- [Authentication Guide](./AUTH_README.md) - Auth features and troubleshooting
- [Migration Guide](./MIGRATION_GUIDE.md) - Upgrading from old versions
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Technical details

**External Resources:**
- [React 19 Docs](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Firebase Docs](https://firebase.google.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

**Common Issues:**
- **Firebase Auth not working:** Check VITE_ prefix on environment variables
- **Images not generating:** Verify GEMINI_API_KEY in .env
- **Build errors:** Run `yarn install` to sync dependencies
- **Data not syncing:** Check Firestore security rules
- **Phone auth failing:** Enable phone auth in Firebase Console

---

## 🎯 Future Roadmap

**Planned Features:**
- [ ] Move images from base64 to Firebase Storage (reduce Firestore usage)
- [ ] Add image editing capabilities (crop, filters, adjustments)
- [ ] Implement social sharing (share prompts, assets)
- [ ] Add collaborative projects (multi-user)
- [ ] Create public marketplace for prompt templates
- [ ] Implement usage analytics and billing
- [ ] Add advanced AI features (inpainting, outpainting, style transfer)
- [ ] Mobile app (React Native)
- [ ] API for third-party integrations

**Technical Debt:**
- [ ] Add unit tests (Vitest)
- [ ] Add E2E tests (Playwright)
- [ ] Improve error boundaries
- [ ] Add performance monitoring
- [ ] Optimize bundle size
- [ ] Implement service worker for offline support
- [ ] Add accessibility audits (WCAG 2.1)
- [ ] Migrate to CSS modules or Tailwind

---

**Remember:** This is a creative tool that empowers users to generate beautiful images with AI. Keep the UX simple, intuitive, and delightful! 🎨✨
