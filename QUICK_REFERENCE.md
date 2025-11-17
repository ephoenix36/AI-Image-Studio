# Quick Reference - AI Image Studio

## 📍 File Locations

### Need to find something? Here's where everything lives:

| What you need | Where to find it |
|---------------|------------------|
| **React Components** | `src/components/` |
| **Main App Logic** | `src/Studio.tsx` |
| **Image Editor** | `src/ImageEditorModal.tsx` |
| **Type Definitions** | `src/types/types.ts` |
| **Utility Functions** | `src/utils/utils.ts` |
| **Constants** | `src/constants.ts` |
| **API Services** | `src/services/` |
| **Authentication** | `src/contexts/AuthContext.tsx` |
| **Firebase Config** | `src/config/firebase.ts` |
| **Styles** | `src/styles/` |
| **Documentation** | `docs/` |
| **Entry Point** | `index.tsx` |

---

## 🔨 Common Tasks

### Adding a New Component
1. Create file in `src/components/YourComponent.tsx`
2. Export it from `src/components/index.ts`
3. Import using: `import { YourComponent } from '@/components';`

### Adding a New Type
1. Add type to `src/types/types.ts`
2. Import using: `import type { YourType } from '@/types';`

### Adding a New Utility
1. Add function to `src/utils/utils.ts`
2. Import using: `import { yourUtil } from '@/utils';`

### Adding a New Service
1. Create file in `src/services/yourService.ts`
2. Export functions from `src/services/index.ts`
3. Import using: `import { yourFunction } from '@/services';`

---

## 📦 Import Patterns

### ✅ Correct (Use These)
```typescript
// Using @ alias
import Studio from '@/Studio';
import { Icon, Tooltip } from '@/components';
import type { User, Project } from '@/types';
import { blobToBase64 } from '@/utils';
import { generateImage } from '@/services';
import { ICONS } from '@/constants';
```

### ❌ Avoid (Old Style)
```typescript
// Don't use relative paths
import Studio from '../Studio';
import { Icon } from '../../components/Icon';
import type { User } from '../../../types';
```

---

## 🏃 Running the App

### Development
```bash
pnpm dev          # Start dev server on localhost:3000
```

### Build
```bash
pnpm build        # Build for production
pnpm preview      # Preview production build
```

---

## 📖 Documentation

All documentation is in the `docs/` folder:

- **[AUTH_README.md](docs/AUTH_README.md)** - Authentication setup & usage
- **[FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)** - Firebase configuration
- **[MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)** - Migration from old structure
- **[IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[SETUP_CHECKLIST.md](docs/SETUP_CHECKLIST.md)** - Setup steps

---

## 🎯 Key Files

### Entry Point
- `index.tsx` - React app initialization
- `index.html` - HTML template

### Main Application
- `src/Studio.tsx` - Main app component (2000+ lines)
- `src/ImageEditorModal.tsx` - Advanced image editor

### Configuration
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables (not in git)
- `.env.example` - Example env file template

---

## 🔧 Configuration

### TypeScript Path Alias
`tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Vite Alias
`vite.config.ts`:
```typescript
{
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
}
```

---

## 🌳 Project Tree

```
AI-Image-Studio/
├── src/
│   ├── components/      # UI components + index.ts
│   ├── contexts/        # React contexts + index.ts
│   ├── services/        # API services + index.ts
│   ├── config/          # Configuration files
│   ├── types/           # Type definitions + index.ts
│   ├── utils/           # Utilities + index.ts
│   ├── styles/          # CSS files
│   ├── constants.ts     # App constants
│   ├── Studio.tsx       # Main component
│   └── ImageEditorModal.tsx
├── docs/                # All documentation
├── index.tsx            # React entry
├── index.html           # HTML entry
└── package.json         # Dependencies
```

---

## 💡 Tips

1. **Use barrel exports**: Import multiple items from `@/components` instead of individual files
2. **Keep types updated**: All types in `src/types/types.ts`
3. **Use constants**: Define magic strings/numbers in `src/constants.ts`
4. **Follow patterns**: Look at existing components for structure
5. **Check docs**: Documentation in `docs/` folder has detailed guides

---

## 🆘 Troubleshooting

### Import errors?
- Ensure path starts with `@/`
- Check the file exists in `src/`
- Verify export in barrel file (`index.ts`)

### Build errors?
```bash
yarn build    # Check for TypeScript errors
```

### Dev server issues?
```bash
# Clear cache and restart
Remove-Item -Recurse -Force node_modules, dist
pnpm install
pnpm dev
```

---

**Last Updated:** November 7, 2025  
**Structure Version:** 2.0 (Post-Cleanup)
