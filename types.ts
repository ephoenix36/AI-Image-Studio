
export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: number;
    // Fix: Add 'type' to distinguish between prompt and asset folders.
    type: 'prompt' | 'asset';
}

export interface CustomPromptHistory {
    version: string;
    text: string;
    tags: string[];
    referenceAssetIds: string[];
    aspectRatio?: string;
    createdAt: number;
}

export interface CustomPrompt {
    id: string;
    name: string;
    version: string;
    text: string;
    tags: string[];
    folderId: string | null;
    referenceAssetIds: string[];
    aspectRatio?: string;
    createdAt: number;
    history?: CustomPromptHistory[];
}

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
    resolution?: { width: number, height: number };
    referenceAssetIds?: string[];
}

export interface Tip {
    title: string;
    description: string;
}

export interface PromptCategory {
    category: string;
    description: string;
    prompts: string[];
}

export type MediaType = "Products" | "Documents & Media" | "Posters & Art" | "People & Characters" | "Design & Concepts" | "Virtual Try-On" | "Stylized Portraits";

export type MediaCategories = Record<MediaType, PromptCategory[]>;

export interface Notification {
    id: string;
    message: string;
    type: 'info' | 'error';
}

export interface ReferenceImage {
    id: string;
    type: 'image';
    base64: string;
    mimeType: string;
    name: string;
    previewUrl: string;
    folderId: string | null;
    createdAt: number;
}

export interface ReferenceDocument {
    id: string;
    type: 'document';
    content: string;
    name: string;
    mimeType: string;
    folderId: string | null;
    createdAt: number;
}

export type ReferenceAsset = ReferenceImage | ReferenceDocument;


export interface LoadingState {
    isLoading: boolean;
    controller: AbortController;
}

export interface Project {
    id: string;
    name: string;
    customPrompts: CustomPrompt[];
    generatedAssets: GeneratedAsset[];
    referenceAssets: ReferenceAsset[];
    folders: Folder[];
    createdAt: number;
}

export interface User {
    username: string;
    password?: string;
    projects: Project[];
    activeProjectId: string | null;
    activePromptFolderId: string | null;
    activeAssetFolderId: string | null;
}