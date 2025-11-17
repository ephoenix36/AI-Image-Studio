# Migration Guide: LocalStorage to Firebase

This guide helps existing users migrate their data from the old localStorage-based authentication to the new Firebase authentication system.

## What Changed?

The AI Image Studio now uses Firebase Authentication instead of storing user data in localStorage. This provides:

- ✅ **Secure authentication** with industry-standard security
- ✅ **Multiple sign-in options** (Google, Email/Password, Phone/SMS)
- ✅ **Email verification** for new accounts
- ✅ **Cloud sync** - Access your projects from any device
- ✅ **Better security** - No passwords stored locally

## Automatic Migration (Coming Soon)

We're working on an automatic migration tool. In the meantime, you can manually export your data.

## Manual Data Export (Before Update)

If you want to save your existing projects before updating:

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Run this command**:
   ```javascript
   const data = localStorage.getItem('aiImageStudioUsers');
   const blob = new Blob([data], { type: 'application/json' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'ai-image-studio-backup.json';
   a.click();
   ```
4. **Save the downloaded file** somewhere safe

## After Migration to Firebase

### First Time Setup

1. **Sign up** using your preferred method:
   - Email/Password (you'll receive a verification email)
   - Google Account
   - Phone Number (SMS verification)

2. **Your account is created** with a default "My First Project"

### Import Your Old Data (Manual Method)

Currently, you'll need to manually recreate your projects. We recommend:

1. **For Images**: Download your generated images before updating
2. **For Prompts**: Copy your custom prompts to a text file
3. **After Migration**: Manually re-add important prompts and upload images as reference assets

## Data Location Changes

| Old System | New System |
|------------|------------|
| `localStorage` | Firebase Firestore |
| Local browser only | Cloud-synced across devices |
| Username/Password | Firebase Authentication |
| No verification | Email/Phone verification |

## Important Notes

- **Old data remains in localStorage** - It won't be automatically deleted
- **Projects are not automatically synced** - Old localStorage data is separate
- **Future updates will include migration tools** to help transfer data

## Troubleshooting

### "I can't see my old projects"

The old projects are stored in localStorage with the old authentication system. They're not automatically transferred to Firebase. Use the export method above to save them first.

### "Do I need to use the same email I used before?"

No, the old system only used usernames. You can use any email address with the new Firebase system.

### "Can I keep using the old system?"

The old localStorage-based authentication is being phased out. We recommend migrating to Firebase for better security and features.

## Need Help?

If you encounter issues during migration:

1. Check your browser console for errors
2. Make sure you've exported your data using the steps above
3. Create an issue on our GitHub repository with details

## Future Features

We're working on:
- ✅ Automatic data migration from localStorage to Firebase
- ✅ Import/Export functionality for projects
- ✅ Bulk operations for managing multiple projects
- ✅ Sharing and collaboration features
