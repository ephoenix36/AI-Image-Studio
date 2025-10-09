# File System Storage Migration - Documentation

## Overview

The AI Image Studio has been migrated from browser localStorage to a hybrid storage system that supports storing data on the user's local file system, removing the 5-10MB browser quota limitation.

## Key Changes

### 1. **New Storage Services**

#### `services/fileSystemStorage.ts`
- Implements File System Access API for storing data on user's device
- Handles directory permissions and persistence
- Stores data in JSON files on the user's file system
- No storage quota limitations (limited only by disk space)

#### `services/storageService.ts`
- Hybrid storage service that automatically chooses best storage method
- Falls back to localStorage for browsers that don't support File System Access API
- Provides unified API for all storage operations

### 2. **Storage Modes**

#### File System Mode (Recommended)
- **Supported Browsers**: Chrome 86+, Edge 86+, Opera 72+
- **Storage Location**: User-selected folder on their device
- **Quota**: No limit (uses disk space)
- **Persistence**: Permanent (survives browser data clearing)
- **Files Created**:
  - `ai-image-studio-data.json` - All project data
  - `active-user.txt` - Currently logged-in user

#### Browser Storage Mode (Fallback)
- **Supported Browsers**: All modern browsers
- **Storage Location**: Browser's localStorage
- **Quota**: 5-10MB (browser-dependent)
- **Persistence**: Cleared when browser data is cleared
- **Files**: None (stored in browser)

### 3. **Updated Components**

#### `Studio.tsx`
- Load user data from storage service instead of localStorage
- Save user data using storage service
- Async storage operations
- Storage mode monitoring

#### `SettingsModal.tsx`
- **New Storage Section** with:
  - Current storage mode display
  - Storage location display
  - "Switch to File System Storage" button
  - "Change Storage Folder" button
  - Export/Import backup buttons

### 4. **User Experience**

#### First Time Setup
1. User opens the app
2. If File System Access API is supported:
   - User is prompted to select a folder for storage
   - Data is saved to that folder
3. If not supported:
   - Falls back to localStorage (no prompt)

#### Migrating from LocalStorage
1. Go to Settings → Storage section
2. Click "Switch to File System Storage"
3. Select a folder on your device
4. Data is automatically migrated
5. Confirm migration successful

#### Changing Storage Location
1. Go to Settings → Storage section
2. Click "Change Storage Folder"
3. Select a new folder
4. Data is automatically moved

## Technical Details

### File System Access API

**Browser Compatibility:**
| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 86+     | ✅ Full |
| Edge    | 86+     | ✅ Full |
| Opera   | 72+     | ✅ Full |
| Firefox | -       | ❌ No   |
| Safari  | -       | ❌ No   |

**Permissions:**
- `readwrite` mode for the selected directory
- Permissions are requested once and persisted
- Users can revoke permissions at any time via browser settings

### Data Structure

**ai-image-studio-data.json:**
```json
[
  {
    "username": "user1",
    "activeProjectId": "project-id",
    "projects": [
      {
        "id": "project-id",
        "name": "My Project",
        "customPrompts": [...],
        "generatedAssets": [...],
        "referenceAssets": [...],
        "folders": [...]
      }
    ]
  }
]
```

**active-user.txt:**
```
user1
```

### Storage API

```typescript
// Initialize storage (request directory if needed)
await Storage.initializeStorage();

// Save users
await Storage.saveUsers(users);

// Load users
const result = await Storage.loadUsers();
const users = result.data;

// Save active user
await Storage.saveActiveUser(username);

// Load active user
const result = await Storage.loadActiveUser();
const username = result.data;

// Get storage info
const info = await Storage.getStorageInfo();
// { mode: 'filesystem', location: 'MyDocuments', supported: true }

// Change storage location
await Storage.changeStorageLocation();

// Migrate from localStorage to file system
await Storage.migrateToFileSystem();

// Export data as downloadable JSON
await Storage.exportData();

// Import data from JSON file
await Storage.importData(file);
```

## Benefits

### 1. **No Storage Quota**
- Store unlimited images (limited only by disk space)
- No more "QuotaExceededError"
- No automatic cleanup needed

### 2. **Data Persistence**
- Data survives browser cache clearing
- Data survives browser reinstallation
- Easy to backup (just copy the folder)

### 3. **User Control**
- Users choose where data is stored
- Easy to move data to another location
- Can backup/sync folder with cloud services

### 4. **Better Performance**
- File I/O is generally faster than localStorage for large data
- No JSON parsing overhead on every operation
- Async operations don't block UI

## Migration Guide

### For Users Currently on LocalStorage

1. **Check Browser Compatibility**
   - Chrome 86+ or Edge 86+ recommended
   - Firefox/Safari users must stay on localStorage

2. **Migrate to File System**
   - Open Settings → Storage
   - Click "Switch to File System Storage"
   - Select a folder (e.g., Documents/AI-Image-Studio)
   - Wait for migration to complete
   - Verify data is intact

3. **Optional: Export Backup First**
   - Before migrating, click "Export Backup"
   - Save the JSON file as a safety backup
   - Can import later if needed

### For Developers

**Testing File System Storage:**
```javascript
// Check if supported
import { isFileSystemSupported } from './services/fileSystemStorage';
if (isFileSystemSupported()) {
  console.log('File System Access API supported!');
}

// Test storage operations
const result = await Storage.saveUsers([testUser]);
console.log(result.success ? 'Saved!' : result.error);
```

**Fallback Handling:**
```javascript
const info = await Storage.getStorageInfo();
if (info.mode === 'localstorage') {
  // Show warning about storage limitations
  console.warn('Using localStorage - 5-10MB limit applies');
}
```

## Troubleshooting

### "No directory selected" Error
**Cause**: User cancelled directory picker or permissions denied
**Solution**: Try again and select a valid folder with write permissions

### "Failed to save" Error
**Cause**: No write permissions or disk full
**Solution**: 
- Check folder permissions
- Try selecting a different folder
- Free up disk space

### Data Not Persisting
**Cause**: Permissions revoked or folder moved/deleted
**Solution**:
- Go to Settings → Storage
- Click "Change Storage Folder"
- Select the folder again

### Migration Failed
**Cause**: Corrupted localStorage data or permissions
**Solution**:
1. Export backup from localStorage first
2. Clear browser data
3. Import backup after setting up file system storage

## Security & Privacy

### Data Location
- All data stays on user's local device
- No data sent to external servers
- User has full control over data location

### Permissions
- App only requests access to user-selected folder
- Cannot access files outside selected folder
- Permissions can be revoked anytime in browser settings

### Backup & Recovery
- Users should regularly export backups
- Folder can be backed up using standard file backup tools
- Data is stored in plain JSON (human-readable)

## Future Enhancements

1. **Automatic Backups**
   - Periodic automatic export to backup folder
   - Configurable backup frequency

2. **Cloud Sync**
   - Optional sync to cloud storage (Google Drive, Dropbox)
   - Cross-device synchronization

3. **Image Optimization**
   - Store images in separate files
   - Compress images to save space
   - Lazy loading from disk

4. **Version Control**
   - Track changes to projects
   - Rollback to previous versions
   - Conflict resolution for multi-device usage

## Files Modified

- `services/fileSystemStorage.ts` - New file system storage service
- `services/storageService.ts` - New hybrid storage service
- `Studio.tsx` - Updated to use new storage service
- `components/SettingsModal.tsx` - Added storage management UI
- `FILESYSTEM_STORAGE.md` - This documentation

## Browser Compatibility

✅ **Full Support**: Chrome 86+, Edge 86+, Opera 72+
⚠️ **Fallback to LocalStorage**: Firefox, Safari, older browsers
❌ **Not Supported**: IE11 and older browsers (app incompatible)
