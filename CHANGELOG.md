# AI Image Studio - Changelog

## 2025-10-06 - Critical: LocalStorage Quota Fix

### Fixed QuotaExceededError
- **Issue**: App crashed with `QuotaExceededError` when generating multiple images with references
- **Root Cause**: Base64-encoded images stored in localStorage exceeded browser quota (5-10MB)
- **Solution**: Implemented comprehensive error handling with automatic cleanup strategies

### Changes Made

#### Error Handling & Recovery
- Added try-catch around localStorage.setItem() operations
- Implemented 3-tier fallback strategy:
  1. Remove base64 data from reference assets (keep URLs)
  2. Limit to last 50 generated assets and 20 reference assets
  3. Show critical error and guide user to manual cleanup

#### Storage Monitoring
- Added `getLocalStorageSize()` utility function
- Added `isStorageNearQuota()` to detect when >80% full
- Periodic storage checks (every 5 minutes)
- Proactive user warnings before quota is reached

#### User Notifications
- "Storage cleaned up" notification after automatic cleanup
- "Storage critically full" warning when near quota
- "Storage full!" error with clear user guidance

### Files Modified
- `Studio.tsx`: Added error handling, cleanup logic, storage monitoring
- `utils.ts`: Added storage utility functions (getLocalStorageSize, isStorageNearQuota, getLocalStorageSizeFormatted)
- `STORAGE_FIX.md`: Comprehensive documentation of the fix
- `CHANGELOG.md`: This changelog entry

### User Impact
- App will no longer crash when storage quota is exceeded
- Automatic cleanup preserves most recent work
- Users are warned proactively to export/delete old images
- May need to re-upload reference images after cleanup

### Best Practices for Users
1. Regularly export important images
2. Delete old/unwanted generated images
3. Clear reference images when no longer needed
4. Monitor storage warnings

---

## 2025-10-06 - Image Generation Model Updates

### Changed Image Generation Model
- **Switched from Imagen to Gemini 2.5 Flash Image** as the default model for text-to-image generation
- Updated `services/geminiService.ts` to use `gemini-2.5-flash-image` model
- Changed from `generateImages()` API method to `generateContent()` with `responseModalities: [Modality.IMAGE, Modality.TEXT]`

### Technical Details

#### Previous Implementation (Imagen)
```typescript
const response = await ai.models.generateImages({
  model: 'imagen-4.0-generate-001',
  prompt,
  config: { 
    numberOfImages: 1, 
    aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9" 
  },
});
```

#### New Implementation (Gemini 2.5 Flash Image)
```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: {
    parts: [{ text: prompt }],
  },
  config: { 
    responseModalities: [Modality.IMAGE, Modality.TEXT]
  }
});
```

### Benefits
- **Consistent Model Family**: Both text-to-image and image-to-image now use Gemini models
- **Unified API**: Single `generateContent()` method for all generation types
- **Better Integration**: Seamless multimodal capabilities (text + image outputs)
- **Future-Ready**: Gemini 2.5 is Google's latest generative AI model family

### Vertex AI Support Added
- Added environment variable configuration for Vertex AI
- SDK automatically switches between Gemini Developer API and Vertex AI based on `GOOGLE_GENAI_USE_VERTEXAI` flag
- See `.env` file for configuration options

### Files Modified
- `services/geminiService.ts` - Updated image generation logic
- `vite.config.ts` - Added Vertex AI environment variable exposure
- `.env` - Added Vertex AI configuration template
- `.gitignore` - Ensured `.env` is not committed

### Documentation References
Based on official Google GenAI SDK documentation:
- https://github.com/googleapis/js-genai
- Model: `gemini-2.5-flash-image` (or `gemini-2.5-flash-image-preview` for preview features)
