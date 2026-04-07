/**
 * IndexedDB-backed storage service for large binary data (images).
 * localStorage has a ~5-10 MB quota which is easily exceeded by base64 images.
 * IndexedDB provides hundreds of MB+ and is the right home for image blobs.
 */

const DB_NAME = 'aiImageStudio';
const DB_VERSION = 1;
const IMAGE_STORE = 'images';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Store an image data URL or base64 string by asset ID. */
export async function saveImageData(id: string, data: string): Promise<void> {
  if (!data) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readwrite');
    tx.objectStore(IMAGE_STORE).put(data, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve an image data URL or base64 string by asset ID. */
export async function getImageData(id: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readonly');
    const req = tx.objectStore(IMAGE_STORE).get(id);
    req.onsuccess = () => resolve((req.result as string) || null);
    req.onerror = () => reject(req.error);
  });
}

/** Delete image data by asset ID. */
export async function deleteImageData(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readwrite');
    tx.objectStore(IMAGE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Delete multiple image records. */
export async function deleteImageDataBatch(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readwrite');
    const store = tx.objectStore(IMAGE_STORE);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all stored image IDs. */
export async function getAllImageIds(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readonly');
    const req = tx.objectStore(IMAGE_STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Rehydrate image data URLs from IndexedDB back into a user object.
 * Call this after loading from localStorage to restore stripped image data.
 */
export async function rehydrateImages(
  projects: Array<{
    generatedAssets: Array<{ id: string; imageUrl: string }>;
    referenceAssets: Array<{ id: string; type: string; base64?: string; previewUrl?: string }>;
  }>
): Promise<void> {
  for (const project of projects) {
    // Restore generated asset image URLs
    for (const asset of project.generatedAssets) {
      if (!asset.imageUrl) {
        const data = await getImageData(asset.id);
        if (data) asset.imageUrl = data;
      }
    }
    // Restore reference image base64/previewUrl
    for (const ref of project.referenceAssets) {
      if (ref.type === 'image') {
        const imgRef = ref as { id: string; type: string; base64: string; previewUrl: string };
        if (!imgRef.base64 || !imgRef.previewUrl) {
          const data = await getImageData(ref.id);
          if (data) {
            // data is stored as a data URI; extract base64 and set preview
            if (data.startsWith('data:')) {
              imgRef.previewUrl = data;
              imgRef.base64 = data.split(',')[1] || '';
            } else {
              imgRef.base64 = data;
              imgRef.previewUrl = '';
            }
          }
        }
      }
    }
  }
}

/**
 * Persist all image data from a user object into IndexedDB.
 * Call this whenever the user state changes.
 */
export async function persistImages(
  projects: Array<{
    generatedAssets: Array<{ id: string; imageUrl: string }>;
    referenceAssets: Array<{ id: string; type: string; base64?: string; previewUrl?: string }>;
  }>
): Promise<void> {
  for (const project of projects) {
    for (const asset of project.generatedAssets) {
      if (asset.imageUrl && asset.imageUrl.startsWith('data:')) {
        await saveImageData(asset.id, asset.imageUrl);
      }
    }
    for (const ref of project.referenceAssets) {
      if (ref.type === 'image') {
        const imgRef = ref as { id: string; previewUrl?: string; base64?: string };
        // Store the full data URI if available
        if (imgRef.previewUrl && imgRef.previewUrl.startsWith('data:')) {
          await saveImageData(ref.id, imgRef.previewUrl);
        } else if (imgRef.base64) {
          await saveImageData(ref.id, imgRef.base64);
        }
      }
    }
  }
}

// --- File System Access API helpers (local folder persistence) ---

/** Check if the File System Access API is available. */
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

let _dirHandle: FileSystemDirectoryHandle | null = null;

/** Prompt user to pick a directory and cache the handle. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    _dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    return _dirHandle;
  } catch {
    // User cancelled
    return null;
  }
}

/** Get the cached directory handle. */
export function getDirectoryHandle(): FileSystemDirectoryHandle | null {
  return _dirHandle;
}

/** Ensure a subdirectory exists. */
async function ensureSubdir(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  return parent.getDirectoryHandle(name, { create: true });
}

/**
 * Save a data-URI image to the local filesystem via File System Access API.
 * Directory structure: <root>/generated/<filename>.png  or  <root>/references/<filename>
 */
export async function saveToLocalFolder(
  dirHandle: FileSystemDirectoryHandle,
  subfolder: 'generated' | 'references' | 'prompts',
  filename: string,
  data: Blob | string
): Promise<void> {
  const sub = await ensureSubdir(dirHandle, subfolder);
  const fileHandle = await sub.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  if (typeof data === 'string') {
    await writable.write(data);
  } else {
    await writable.write(data);
  }
  await writable.close();
}

/** Convert a data URI to a Blob. */
export function dataURItoBlob(dataURI: string): Blob {
  const parts = dataURI.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}
