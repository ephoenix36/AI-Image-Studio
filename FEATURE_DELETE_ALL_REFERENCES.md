# Feature: Delete All Reference Assets Button

## Overview

Added a "Delete All" button to the Reference Assets section for quick bulk deletion of reference images.

## Feature Details

### Location
The button appears in the **Reference Assets** section of the left sidebar, next to the section label.

### Appearance
```
Reference Assets (Drop files or click)    [Delete All (5)]
```

- **Label**: "Delete All (X)" where X is the number of reference assets in the current folder
- **Style**: Small red button with hover effect
- **Visibility**: Only shown when there are reference assets to delete

### Functionality

#### What It Does
1. **Counts visible assets** in the current folder
2. **Shows confirmation** before deletion
3. **Deletes all reference assets** in the current folder
4. **Updates prompt references** - removes deleted asset IDs from all prompts
5. **Shows notification** confirming deletion

#### User Flow
1. User has reference assets in a folder
2. User sees "Delete All (X)" button next to section label
3. User clicks "Delete All"
4. Confirmation dialog appears: "Delete all X reference asset(s) in this folder?"
5. User clicks "OK"
6. All reference assets in current folder are deleted
7. Notification shows: "X item(s) deleted."

### Code Implementation

```typescript
<div className="flex items-center justify-between mb-1">
    <label className="block text-sm font-medium text-slate-400">
        Reference Assets (Drop files or click)
    </label>
    {visibleReferenceAssets.length > 0 && (
        <button 
            onClick={() => {
                if (confirm(`Delete all ${visibleReferenceAssets.length} reference asset(s) in this folder?`)) {
                    const assetIds = visibleReferenceAssets.map(a => a.id);
                    handleConfirmDeleteAssets(assetIds);
                }
            }}
            className="text-xs text-red-400 hover:text-red-300 bg-slate-700 hover:bg-slate-600 py-1 px-2 rounded transition"
        >
            Delete All ({visibleReferenceAssets.length})
        </button>
    )}
</div>
```

## Benefits

### User Experience
- ✅ **Quick cleanup**: Delete multiple reference images with one click
- ✅ **Folder-scoped**: Only deletes assets in current folder (safe)
- ✅ **Clear count**: Shows exactly how many items will be deleted
- ✅ **Confirmation**: Prevents accidental deletion
- ✅ **Efficient**: No need to select and delete individual items

### Technical
- ✅ **Reuses existing code**: Uses `handleConfirmDeleteAssets` function
- ✅ **Proper cleanup**: Removes references from prompts automatically
- ✅ **Consistent behavior**: Same deletion logic as individual/batch delete
- ✅ **Conditional rendering**: Only appears when there are assets

## Scope

### What Gets Deleted
- ✅ **All reference assets** in the currently selected asset folder
- ✅ **Asset references** removed from prompts that used them

### What's Protected
- ✅ **Other folders**: Assets in other folders are NOT affected
- ✅ **Generated images**: Only reference assets are deleted
- ✅ **Prompts**: Prompts themselves are preserved (only references removed)

## Usage Examples

### Example 1: Clean Up Test Images
```
Scenario: User uploaded 20 test images to try the app
Current folder: "Home" with 20 reference images
Action: Click "Delete All (20)"
Confirm: "Delete all 20 reference asset(s) in this folder?"
Result: All 20 test images deleted, folder is clean
```

### Example 2: Folder-Specific Deletion
```
Scenario: User has images in multiple folders
Folder "Products": 10 images
Folder "Backgrounds": 5 images
Current folder: "Products"
Action: Click "Delete All (10)"
Result: Only the 10 images in "Products" are deleted
        The 5 images in "Backgrounds" remain untouched
```

### Example 3: Empty Folder
```
Scenario: User has no reference images in current folder
Current folder: Empty
Button visibility: Delete All button is hidden
```

## Safety Features

### 1. Confirmation Dialog
- **Always asks for confirmation** before deleting
- Shows exact count of items to be deleted
- User can cancel at any time

### 2. Folder Scoping
- **Only affects current folder** - not all folders
- Other folders' assets remain safe
- Clear visibility of what will be deleted (count in button)

### 3. Reference Cleanup
- **Automatically removes** asset IDs from prompts
- **Prevents broken references** in prompts
- Reference counts update correctly

### 4. Notification
- **Confirms deletion** with notification
- Shows how many items were deleted
- User feedback confirms action completed

## UI/UX Design

### Visual Hierarchy
```
┌─────────────────────────────────────────────┐
│ Reference Assets (Drop...) [Delete All (5)] │ ← Header with button
├─────────────────────────────────────────────┤
│ [Drop zone for uploading]                   │
├─────────────────────────────────────────────┤
│ • Image1.jpg                          [×]   │
│ • Image2.jpg                          [×]   │
│ • Image3.jpg                          [×]   │
│ • Image4.jpg                          [×]   │
│ • Image5.jpg                          [×]   │
└─────────────────────────────────────────────┘
```

### Color Coding
- **Red color**: Indicates destructive action (deletion)
- **Hover effect**: Darkens on hover for better feedback
- **Small size**: Less prominent than main actions (intentional friction)

### Responsive Behavior
- **Appears**: When `visibleReferenceAssets.length > 0`
- **Disappears**: When folder is empty
- **Updates count**: As assets are added/removed

## Alternatives Considered

### Why Not Multi-Select + Delete?
**Decision**: Provide "Delete All" for quick cleanup

**Reasoning**:
- "Delete All" is faster for bulk deletion
- Multi-select is still available in gallery view
- Different use cases (quick cleanup vs selective deletion)

### Why Folder-Scoped?
**Decision**: Only delete assets in current folder

**Reasoning**:
- ✅ **Safer**: Users know exactly what will be deleted
- ✅ **Predictable**: Matches user's mental model of folders
- ✅ **Preserves organization**: Other folders unaffected

### Why Use `confirm()` instead of Modal?
**Decision**: Use native browser confirm dialog

**Reasoning**:
- ✅ **Simpler**: No need for additional state management
- ✅ **Faster**: Immediate user feedback
- ✅ **Sufficient**: For folder-scoped deletions, native dialog is adequate
- ⚠️ **Could upgrade**: To custom modal if needed in future

## Testing Scenarios

### ✅ Test 1: Delete All with Assets
1. Upload 5 reference images
2. Verify "Delete All (5)" button appears
3. Click button
4. Verify confirmation dialog
5. Click OK
6. Verify all 5 images deleted
7. Verify notification shown

### ✅ Test 2: Delete All with Empty Folder
1. Select empty folder
2. Verify "Delete All" button does NOT appear
3. Upload 1 image
4. Verify "Delete All (1)" button appears

### ✅ Test 3: Folder Scoping
1. Create two folders: "A" and "B"
2. Upload 3 images to folder "A"
3. Upload 2 images to folder "B"
4. Select folder "A"
5. Click "Delete All (3)"
6. Verify only folder "A" images deleted
7. Verify folder "B" still has 2 images

### ✅ Test 4: Cancel Deletion
1. Upload reference images
2. Click "Delete All (X)"
3. Click "Cancel" in confirmation
4. Verify nothing is deleted

### ✅ Test 5: Prompt Reference Cleanup
1. Create a prompt with 3 reference images
2. Delete all reference images
3. Verify prompt's reference count shows 0
4. Verify no broken references

## Files Modified

### `Studio.tsx`
**Section**: Reference Assets section in left sidebar
**Change**: Added conditional "Delete All" button next to section label

**Lines Modified**: ~1420-1430

## Future Enhancements

### Potential Improvements
- [ ] **Undo functionality**: Allow undoing bulk deletion
- [ ] **Custom modal**: Replace browser confirm with styled modal
- [ ] **Selective delete**: "Delete All Images" vs "Delete All Documents"
- [ ] **Move to trash**: Soft delete with recovery option
- [ ] **Export before delete**: Offer to export before deleting

## Summary

### What Was Added
- ✅ **"Delete All" button** in Reference Assets section
- ✅ **Shows count** of assets to be deleted
- ✅ **Confirmation dialog** before deletion
- ✅ **Folder-scoped** deletion (safe)
- ✅ **Automatic cleanup** of prompt references

### User Benefits
- 🚀 **Faster cleanup**: One click instead of many
- 🛡️ **Safe deletion**: Folder-scoped with confirmation
- 📊 **Clear feedback**: Count and notification
- 🎯 **Efficient workflow**: No manual selection needed

---

**Status**: ✅ **COMPLETE**
**Date**: October 8, 2025

The "Delete All" button is now available in the Reference Assets section for quick bulk deletion!
