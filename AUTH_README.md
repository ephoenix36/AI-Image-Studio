# AI Image Studio - Authentication Update

## 🎉 New Features

The AI Image Studio now includes a complete authentication system with multiple sign-in options and enhanced security!

### ✨ Authentication Methods

1. **Email & Password**
   - Sign up with your email address
   - Automatic email verification sent on registration
   - Secure password requirements (minimum 6 characters)
   - Password visibility toggle for convenience

2. **Google Sign-In**
   - One-click authentication with your Google account
   - No need to remember another password
   - Seamless integration with Google services

3. **Phone/SMS Authentication**
   - Sign in using your phone number
   - Receive a verification code via SMS
   - Support for international phone numbers
   - Built-in reCAPTCHA protection

### 🔒 Security Features

- **Email Verification**: New email/password accounts must verify their email
- **Firebase Authentication**: Industry-standard security backend
- **Encrypted Data**: User data stored securely in Firebase Firestore
- **Session Management**: Automatic token refresh and secure logout
- **reCAPTCHA Protection**: Prevents automated abuse of phone authentication

### 🌐 Cloud Sync

- **Multi-device Access**: Your projects sync across all your devices
- **Real-time Updates**: Changes are automatically saved to the cloud
- **Data Persistence**: Never lose your work, even if you clear your browser

### 🎨 User Experience

- **Modern UI**: Clean, intuitive authentication screens
- **Responsive Design**: Works perfectly on desktop and mobile
- **Error Handling**: Clear, helpful error messages
- **Loading States**: Visual feedback during authentication

## 🚀 Getting Started

### For New Users

1. Open AI Image Studio
2. Choose your preferred sign-in method:
   - **Email/Password**: Enter your details and create an account
   - **Google**: Click "Continue with Google"
   - **Phone**: Click "Continue with Phone" and enter your number
3. Verify your account (email verification link or SMS code)
4. Start creating amazing AI-generated images!

### For Existing Users

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for information on migrating from the old localStorage system.

## 📋 Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn
- A Firebase project (free tier is sufficient)
- (Optional) Google account for Google Sign-In testing

### Installation

1. **Clone or update the repository**
   ```bash
   git pull origin main
   ```

2. **Install dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Set up Firebase**
   
   Follow the detailed guide in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

4. **Configure environment variables**
   
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your Firebase credentials

5. **Start the development server**
   ```bash
   yarn dev
   # or
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Architecture

### File Structure

```
AI-Image-Studio/
├── config/
│   └── firebase.ts              # Firebase configuration
├── contexts/
│   └── AuthContext.tsx          # Authentication context provider
├── components/
│   ├── AuthScreen.tsx           # Main authentication UI
│   └── [other components...]
├── styles/
│   └── phone-input.css          # Custom phone input styling
├── .env.example                 # Environment variables template
├── FIREBASE_SETUP.md           # Firebase setup guide
├── MIGRATION_GUIDE.md          # Migration from old system
└── AUTH_README.md              # This file
```

### Authentication Flow

```
User Opens App
      ↓
Check Firebase Auth State
      ↓
   Authenticated? ──No──→ Show AuthScreen
      ↓                        ↓
     Yes              User Signs In/Up
      ↓                        ↓
Load User Data from      Verify Email/Phone
   Firestore                  ↓
      ↓                Create/Load User Data
Show Main Studio ←──────────────┘
```

### Data Storage

```
Firebase Firestore
└── users/
    └── {userId}/
        ├── username: string
        ├── projects: Project[]
        ├── activeProjectId: string
        ├── activePromptFolderId: string
        └── activeAssetFolderId: string
```

## 🔧 Configuration

### Environment Variables

Required variables in `.env`:

```env
# Firebase Config (from Firebase Console)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Gemini API
GEMINI_API_KEY=
VITE_GEMINI_API_KEY=
```

### Firebase Console Setup

1. **Authentication Methods**: Enable Email/Password, Google, and Phone
2. **Firestore Database**: Create database with proper security rules
3. **Authorized Domains**: Add your deployment domain
4. **Email Templates**: Customize verification email (optional)

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions.

## 🧪 Testing

### Test Phone Numbers (Development)

Add test phone numbers in Firebase Console to avoid SMS charges:

1. Go to Authentication > Settings > Phone numbers for testing
2. Add: `+1 650-555-1234` with code `123456`
3. Use this number during development

### Email Verification

- Sign up with a real email to test verification
- Check spam folder if verification email doesn't arrive
- Verification links expire after a certain time

## 📱 Supported Platforms

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Desktop and Mobile devices
- ✅ iOS and Android (via web browser)
- ✅ Progressive Web App (PWA) compatible

## ⚠️ Important Notes

### Security

- Never commit `.env` file to version control
- Use Firebase Security Rules to protect user data
- Implement rate limiting in production
- Monitor Firebase usage and costs

### Phone Authentication

- Phone authentication incurs SMS costs
- Free tier includes limited SMS messages
- Use test phone numbers during development
- Consider email verification as primary method

### Email Verification

- Users can use the app before verification
- Consider requiring verification for certain features
- Verification emails may go to spam
- Customize email templates in Firebase Console

## 🐛 Troubleshooting

### Common Issues

**"Firebase: Error (auth/unauthorized-domain)"**
- Solution: Add your domain to Firebase Console > Authentication > Settings > Authorized domains

**"Cannot find module 'firebase'"**
- Solution: Run `yarn install` or `npm install`

**"Invalid API key"**
- Solution: Check your `.env` file has correct Firebase credentials

**Phone verification not working**
- Solution: Ensure domain is authorized and reCAPTCHA is not blocked

**Email not sending**
- Solution: Check Firebase quota, verify email method is enabled

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for more troubleshooting tips.

## 🚀 Deployment

### Environment Variables

Set these in your hosting platform (Vercel, Netlify, etc.):

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
GEMINI_API_KEY=your-gemini-key
VITE_GEMINI_API_KEY=your-gemini-key
```

### Build Command

```bash
yarn build
# or
npm run build
```

### Deploy

Follow your hosting platform's deployment guide for Vite applications.

## 📚 Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [React Phone Number Input](https://www.npmjs.com/package/react-phone-number-input)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## 🤝 Contributing

Found a bug or want to contribute? Please check the project's GitHub repository.

## 📄 License

See the main project LICENSE file.

---

**Need Help?** Check [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) or create an issue on GitHub.
