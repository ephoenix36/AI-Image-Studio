# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the AI Image Studio with Google Sign-In, Email/Password, and Phone (SMS) verification.

## Prerequisites

- A Google account
- Node.js and pnpm installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "AI Image Studio")
4. (Optional) Enable Google Analytics if desired
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project, click the **Web icon** (`</>`) to add a web app
2. Enter an app nickname (e.g., "AI Image Studio Web")
3. (Optional) Check "Also set up Firebase Hosting" if you plan to use it
4. Click "Register app"
5. Copy the Firebase configuration object - you'll need these values for your `.env` file

## Step 3: Enable Authentication Methods

### Enable Email/Password Authentication

1. In the Firebase Console, go to **Authentication** > **Sign-in method**
2. Click on **Email/Password**
3. Toggle **Enable** to ON
4. Click **Save**

### Enable Google Sign-In

1. In the same **Sign-in method** page, click on **Google**
2. Toggle **Enable** to ON
3. Set a project support email (your email)
4. Click **Save**

### Enable Phone Authentication

1. In the same **Sign-in method** page, click on **Phone**
2. Toggle **Enable** to ON
3. Click **Save**

**Important for Phone Auth:**
- Phone authentication requires reCAPTCHA verification
- For testing, you can add test phone numbers in **Authentication** > **Settings** > **Phone numbers for testing**
- Add test numbers in E.164 format (e.g., +1 650-555-3434) and a verification code (e.g., 123456)

## Step 4: Set Up Firestore Database

1. In the Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development) or **Start in production mode** (for production)
4. Select a Cloud Firestore location (choose closest to your users)
5. Click **Enable**

### Set Firestore Security Rules (Important!)

Replace the default rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 5: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the Firebase configuration values from Step 2:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

3. Add your Gemini API key:
   ```env
   GEMINI_API_KEY=your-gemini-api-key
   VITE_GEMINI_API_KEY=your-gemini-api-key
   ```

## Step 6: Configure Authorized Domains

For Google Sign-In and Phone Authentication to work:

1. Go to **Authentication** > **Settings** > **Authorized domains**
2. Add your domains:
   - `localhost` (for local development - should already be there)
   - Your production domain (e.g., `yourdomain.com`)

## Step 7: Test the Authentication

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open your browser to `http://localhost:3000`

4. Test each authentication method:
   - **Email/Password**: Sign up with a new email and password
   - **Google Sign-In**: Click "Continue with Google"
   - **Phone**: Click "Continue with Phone" and enter a phone number

## Email Verification

When users sign up with email/password, they will receive a verification email. To customize the email template:

1. Go to **Authentication** > **Templates** in Firebase Console
2. Click on **Email address verification**
3. Customize the template as needed
4. Click **Save**

## Phone Number Testing (Development)

To test phone authentication without using real phone numbers:

1. Go to **Authentication** > **Settings**
2. Scroll down to **Phone numbers for testing**
3. Add test phone numbers with verification codes:
   - Phone number: `+1 650-555-1234`
   - Verification code: `123456`
4. Use these numbers during development to avoid SMS charges

## Production Considerations

### Security Rules

Update Firestore security rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false; // Prevent deletion from client
    }
  }
}
```

### Rate Limiting

Consider implementing rate limiting for authentication attempts to prevent abuse.

### Environment Variables

- Never commit your `.env` file to version control
- Use environment-specific configuration for staging/production
- Store secrets securely (use services like Vercel Environment Variables, Netlify Environment Variables, etc.)

### Email Verification

Consider making email verification mandatory:
- Check `currentUser.emailVerified` before allowing access to certain features
- Show a banner prompting users to verify their email

### Phone Authentication Costs

Phone authentication incurs costs for SMS messages:
- Review Firebase pricing for Authentication
- Consider implementing phone verification only where necessary
- Use test phone numbers during development

## Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
- Add your domain to authorized domains in Firebase Console

### "Firebase: Error (auth/invalid-api-key)"
- Check that your API key in `.env` is correct
- Ensure you're using `VITE_` prefix for environment variables in Vite

### "Firebase: Error (auth/operation-not-allowed)"
- Enable the authentication method in Firebase Console

### Phone authentication not working
- Ensure reCAPTCHA is not being blocked
- Check that your domain is authorized
- Verify phone number is in E.164 format (+countrycode followed by number)

### Email verification not sending
- Check spam/junk folders
- Verify email template is enabled in Firebase Console
- Check Firebase quota limits

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin)
- [Phone Authentication](https://firebase.google.com/docs/auth/web/phone-auth)

## Support

For issues specific to this implementation, please check the project's GitHub issues or create a new one.
