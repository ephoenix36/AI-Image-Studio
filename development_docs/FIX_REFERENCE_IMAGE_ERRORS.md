# Fix: Reference Image Errors

## Issues Fixed

### Issue 1: "Cannot read properties of undefined (reading 'replace')"
**Error when**: Clicking generate with 3 reference images

### Issue 2: Reference counts not decreasing when reference images are deleted
**Problem**: Deleting reference images didn't update the reference count on prompts

---

## Issue 1: Undefined Base64 Error

### Root Cause

When generating images with reference images, the code tried to call `.replace()` on `img.base64`, but some reference images had `undefined` base64 data.

This could happen when:
1. Old reference assets were created without proper base64 data
2. Storage cleanup removed base64 data to save space
3. Migration issues from older versions

**Error Location**: `services/geminiService.ts` line 75
```typescript
const cleanBase64 = img.base64.replace(/\s/g, ''); // ❌ Crashes if img.base64 is undefined
```

### Solution Implemented

Added filtering and validation to handle missing base64 data:

**Before:**
```typescript
const imageParts = referenceImages.map(img => {
  const cleanBase64 = img.base64.replace(/\s/g, ''); // ❌ Crashes
  // ...
});
```

**After:**
```typescript
const imageParts = referenceImages
  .filter(img => img.base64) // ✅ Filter out images without base64 data
  .map(img => {
    const cleanBase64 = img.base64.replace(/\s/g, ''); // ✅ Safe now
    // ...
  });

// ✅ Check if we have any valid images after filtering
if (imageParts.length === 0) {
  return { 
    error: 'Reference images do not have valid data. Please re-upload the reference images.' 
  };
}
```

### Benefits

1. **Prevents Crashes**: Filters out invalid references before processing
2. **Clear Error Message**: User knows exactly what to do if all references are invalid
3. **Partial Success**: If only some references are invalid, generation continues with valid ones
4. **User Guidance**: Error message tells user to re-upload affected images

---

## Issue 2: Reference Counts Not Decreasing

### Root Cause

When deleting reference images, the code only removed them from the `referenceAssets` array, but didn't remove their IDs from the `referenceAssetIds` array in prompts.

**Result**:
- Reference image deleted ✅
- Prompt still thinks it has the reference ❌
- Reference count shows incorrect number ❌
- Trying to use the deleted reference causes errors ❌

### Code Before Fix

```typescript
const handleDeleteReferenceAsset = (assetId: string) => {
    // Only removes from referenceAssets
    updateActiveProject(p => ({
        ...p, 
        referenceAssets: p.referenceAssets.filter(asset => asset.id !== assetId)
    }));
    // ❌ Prompts still have the assetId in their referenceAssetIds array
};
```

### Solution Implemented

#### 1. Fixed `handleDeleteReferenceAsset`

Now removes the asset ID from ALL prompts that reference it:

```typescript
const handleDeleteReferenceAsset = (assetId: string) => {
    updateActiveProject(p => ({
        ...p, 
        // Remove the reference asset
        referenceAssets: p.referenceAssets.filter(asset => asset.id !== assetId),
        // ✅ Also remove this asset ID from all prompts
        customPrompts: p.customPrompts.map(prompt => ({
            ...prompt,
            referenceAssetIds: prompt.referenceAssetIds.filter(id => id !== assetId)
        }))
    }));
};
```

#### 2. Fixed `handleConfirmDeleteAssets` (Batch Delete)

The batch delete function had the same issue:

```typescript
const handleConfirmDeleteAssets = (assetIds: string[]) => {
    updateActiveProject(p => ({
        ...p,
        generatedAssets: p.generatedAssets.filter(asset => !assetIds.includes(asset.id)),
        referenceAssets: p.referenceAssets.filter(asset => !assetIds.includes(asset.id)),
        // ✅ Also remove these asset IDs from all prompts
        customPrompts: p.customPrompts.map(prompt => ({
            ...prompt,
            referenceAssetIds: prompt.referenceAssetIds.filter(id => !assetIds.includes(id))
        }))
    }));
};
```

### Benefits

1. **Accurate Counts**: Reference counts now correctly reflect available references
2. **Data Integrity**: No orphaned reference IDs in prompts
3. **Prevents Errors**: Won't try to load deleted references during generation
4. **Consistent State**: UI and data stay in sync

---

## Files Modified

### 1. `services/geminiService.ts`
- Added `.filter(img => img.base64)` to remove invalid references
- Added validation check for empty imageParts array
- Added helpful error message for invalid references

### 2. `Studio.tsx`
- Updated `handleDeleteReferenceAsset` to clean up prompt references
- Updated `handleConfirmDeleteAssets` to clean up prompt references (batch delete)

---

## Testing Scenarios

### ✅ Scenario 1: Generate with Invalid Reference
**Before:**
1. Have a reference image with missing base64
2. Click Generate
3. ❌ Crash: "Cannot read properties of undefined"

**After:**
1. Have a reference image with missing base64
2. Click Generate
3. ✅ Clear error: "Reference images do not have valid data. Please re-upload the reference images."

### ✅ Scenario 2: Generate with Some Invalid References
**Before:**
1. Have 3 references: 2 valid, 1 invalid
2. Click Generate
3. ❌ Crash

**After:**
1. Have 3 references: 2 valid, 1 invalid
2. Click Generate
3. ✅ Generates using the 2 valid references
4. ✅ Invalid reference filtered out silently

### ✅ Scenario 3: Delete Reference Image
**Before:**
1. Prompt has 3 references
2. Delete 1 reference image
3. Prompt still shows "(3)" references ❌
4. Trying to use references causes errors ❌

**After:**
1. Prompt has 3 references
2. Delete 1 reference image
3. Prompt now shows "(2)" references ✅
4. Generates correctly with remaining 2 references ✅

### ✅ Scenario 4: Batch Delete Reference Images
**Before:**
1. Select and delete multiple reference images
2. Reference counts don't update ❌

**After:**
1. Select and delete multiple reference images
2. Reference counts update correctly ✅
3. All affected prompts updated ✅

---

## User Experience Improvements

### Better Error Messages

| Situation | Old Behavior | New Behavior |
|-----------|--------------|--------------|
| Invalid base64 data | ❌ Cryptic crash | ✅ "Please re-upload the reference images" |
| Some refs invalid | ❌ Crash | ✅ Uses valid refs, filters invalid |
| All refs invalid | ❌ Crash | ✅ Clear error message |

### Accurate UI

| Element | Old Behavior | New Behavior |
|---------|--------------|--------------|
| Reference count badge | ❌ Shows wrong count | ✅ Shows correct count |
| Prompt references | ❌ Includes deleted refs | ✅ Only shows existing refs |
| Generation | ❌ Tries to use deleted refs | ✅ Only uses valid refs |

---

## Edge Cases Handled

1. **All references have missing base64**: Returns helpful error message
2. **Some references have missing base64**: Filters them out, uses valid ones
3. **Delete reference used by multiple prompts**: Updates all affected prompts
4. **Batch delete references**: Updates all affected prompts at once
5. **Delete last reference from prompt**: Count correctly shows 0

---

## Summary

### What Was Broken
- ❌ Crashes when generating with invalid reference images
- ❌ Reference counts didn't update after deletion
- ❌ Orphaned reference IDs remained in prompts
- ❌ Could try to generate with deleted references

### What Was Fixed
- ✅ Validates and filters reference images before generation
- ✅ Reference counts update correctly when images deleted
- ✅ Prompt reference lists stay clean and accurate
- ✅ Clear error messages guide user to fix issues
- ✅ Partial success when some refs are invalid

---

**Status**: ✅ **FIXED**
**Date**: October 8, 2025

Both issues are now resolved! Reference image handling is robust and reference counts are accurate.
