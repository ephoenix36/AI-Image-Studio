<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Image Studio

A powerful AI-powered image generation studio with secure authentication and cloud synchronization.

View your app in AI Studio: https://ai.studio/apps/drive/1yZSpYAhNYfo5zNnBfZE9nl407_yWCyU4

## ✨ Features

- 🎨 **AI Image Generation** - Create stunning images with Google's Gemini AI
- 🔐 **Secure Authentication** - Multiple sign-in options (Email, Google, Phone/SMS)
- ☁️ **Cloud Sync** - Access your projects from any device
- 📱 **Multi-device Support** - Works on desktop and mobile
- 🎯 **Custom Prompts** - Save and organize your favorite prompts
- 📁 **Project Management** - Organize your work into projects
- 🖼️ **Reference Images** - Use reference images to guide generation
- ⚡ **Batch Generation** - Generate multiple images at once

## 🚀 Quick Start

**Prerequisites:**  Node.js 18+ and npm/yarn

### 1. Install dependencies
```bash
yarn install
# or
npm install
```

### 2. Set up Firebase Authentication
See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions.

Quick setup:
```bash
# Copy environment template
cp .env.example .env

# Run the setup script (PowerShell)
.\setup-firebase.ps1

# Or manually edit .env with your Firebase credentials
```

### 3. Configure your API keys
Add your API keys to `.env`:
- `GEMINI_API_KEY` - Your Gemini API key
- Firebase configuration values (from Firebase Console)

### 4. Run the app
```bash
yarn dev
# or
npm run dev
```

The app will be available at `http://localhost:3000`

## 🔐 Authentication

AI Image Studio now supports multiple authentication methods:

- **Email/Password** - Traditional email and password sign-in with verification
- **Google Sign-In** - One-click authentication with your Google account  
- **Phone/SMS** - Sign in with your phone number and verification code

For more details, see [AUTH_README.md](./AUTH_README.md)

## 📚 Documentation

- [Firebase Setup Guide](./FIREBASE_SETUP.md) - How to set up Firebase for authentication
- [Authentication Documentation](./AUTH_README.md) - Detailed auth features and usage
- [Migration Guide](./MIGRATION_GUIDE.md) - Migrating from the old localStorage system
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Technical implementation details

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **AI**: Google Gemini API
- **Styling**: Tailwind CSS (via inline styles)
- **Phone Input**: react-phone-number-input

## 🔒 Security

- Firebase Authentication for secure user management
- Cloud Firestore with security rules
- Email verification for new accounts
- reCAPTCHA protection for phone auth
- No passwords stored locally

## 📖 Usage

1. **Sign In/Sign Up** - Choose your preferred authentication method
2. **Create a Project** - Organize your work into projects
3. **Generate Images** - Use AI to create stunning images
4. **Save Prompts** - Save your best prompts for reuse
5. **Manage Assets** - Organize and download your generated images

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📄 License

See LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for image generation
- Firebase for authentication and database
- The React team for the amazing framework
