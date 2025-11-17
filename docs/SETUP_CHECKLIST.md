# Setup Checklist for AI Image Studio Authentication

Use this checklist to ensure you've completed all necessary steps for setting up authentication.

## ☐ Firebase Project Setup

### Create Firebase Project
- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Create a new project or select existing one
- [ ] Note down project ID: `_________________`

### Register Web App
- [ ] Click Web icon (`</>`) in Firebase project
- [ ] Register app with nickname
- [ ] Copy Firebase configuration values
- [ ] Save configuration for later

## ☐ Enable Authentication Methods

### Email/Password
- [ ] Go to Authentication > Sign-in method
- [ ] Enable Email/Password authentication
- [ ] Click Save

### Google Sign-In
- [ ] Enable Google authentication provider
- [ ] Set project support email
- [ ] Click Save
- [ ] Note: This email will be shown to users

### Phone Authentication
- [ ] Enable Phone authentication provider
- [ ] Click Save
- [ ] (Optional) Add test phone numbers for development

## ☐ Firestore Database Setup

### Create Database
- [ ] Go to Firestore Database
- [ ] Click "Create database"
- [ ] Choose mode (test mode for dev, production for prod)
- [ ] Select database location
- [ ] Click Enable

### Set Security Rules
- [ ] Go to Firestore > Rules
- [ ] Copy and paste the following rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- [ ] Click Publish
- [ ] Verify rules are active

## ☐ Configure Authorized Domains

- [ ] Go to Authentication > Settings
- [ ] Under "Authorized domains", verify these domains are listed:
  - [ ] `localhost` (for development)
  - [ ] Your production domain (if deploying): `_________________`
- [ ] Add any additional domains needed

## ☐ Local Development Setup

### Install Dependencies
- [ ] Open terminal in project directory
- [ ] Run: `pnpm install`
- [ ] Verify no errors during installation

### Configure Environment Variables
- [ ] Copy `.env.example` to `.env`
- [ ] OR run: `.\setup-firebase.ps1` (PowerShell)
- [ ] Fill in all Firebase values:
  - [ ] `VITE_FIREBASE_API_KEY`
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN`
  - [ ] `VITE_FIREBASE_PROJECT_ID`
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET`
  - [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `VITE_FIREBASE_APP_ID`
- [ ] Add Gemini API key:
  - [ ] `GEMINI_API_KEY`
  - [ ] `VITE_GEMINI_API_KEY`
- [ ] Verify `.env` is in `.gitignore`

### Verify Setup
- [ ] Run: `pnpm dev`
- [ ] Open browser to `http://localhost:3000`
- [ ] Verify authentication screen loads
- [ ] Check browser console for errors

## ☐ Test Authentication Methods

### Email/Password
- [ ] Click "Sign Up" tab
- [ ] Enter test email and password
- [ ] Submit form
- [ ] Check email for verification link
- [ ] Click verification link
- [ ] Verify successful sign-in
- [ ] Test sign out
- [ ] Test sign in with same credentials

### Google Sign-In
- [ ] Click "Continue with Google"
- [ ] Select Google account
- [ ] Verify account creation
- [ ] Check Firestore for user data
- [ ] Test sign out
- [ ] Test sign in again

### Phone Authentication
- [ ] Click "Continue with Phone"
- [ ] Enter phone number (or test number)
- [ ] Verify SMS received (or use test code)
- [ ] Enter verification code
- [ ] Verify account creation
- [ ] Test sign out
- [ ] Test sign in again

## ☐ Verify Data Persistence

- [ ] Sign in with any method
- [ ] Create a new project
- [ ] Add a custom prompt
- [ ] Generate an image
- [ ] Sign out
- [ ] Sign in again
- [ ] Verify all data is still present

## ☐ Security Verification

### Firestore Rules
- [ ] Try accessing another user's data (should fail)
- [ ] Try accessing data while signed out (should fail)
- [ ] Verify only authenticated user can read/write their data

### Environment Variables
- [ ] Verify `.env` is NOT committed to git
- [ ] Verify `.env.example` has no real credentials
- [ ] Check `.gitignore` includes `.env`

## ☐ Email Configuration (Optional)

### Customize Verification Email
- [ ] Go to Authentication > Templates
- [ ] Click "Email address verification"
- [ ] Customize sender name
- [ ] Customize email template
- [ ] Add company/app logo
- [ ] Test by creating new account

### Email Settings
- [ ] Set "From" email address (if custom domain)
- [ ] Configure SMTP settings (if needed)
- [ ] Test email delivery

## ☐ Phone Authentication Setup (Development)

### Add Test Phone Numbers
- [ ] Go to Authentication > Settings
- [ ] Scroll to "Phone numbers for testing"
- [ ] Add test number: `+1 650-555-1234`
- [ ] Set verification code: `123456`
- [ ] Save
- [ ] Test with this number

## ☐ Production Readiness

### Update Security Rules
- [ ] Review and update Firestore security rules
- [ ] Consider adding more specific rules
- [ ] Test rules in Firebase Console

### Environment Variables
- [ ] Set up production environment variables
- [ ] Verify all credentials are production-ready
- [ ] Never use development credentials in production

### Domain Configuration
- [ ] Add production domain to authorized domains
- [ ] Verify SSL certificate is valid
- [ ] Test OAuth redirects work

### Monitoring
- [ ] Set up Firebase usage alerts
- [ ] Monitor authentication metrics
- [ ] Set billing alerts (if applicable)

## ☐ Documentation Review

- [ ] Read [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- [ ] Read [AUTH_README.md](./AUTH_README.md)
- [ ] Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- [ ] Bookmark troubleshooting section

## ☐ Backup and Recovery

- [ ] Export Firestore data (if migrating)
- [ ] Document Firebase project settings
- [ ] Save Firebase configuration
- [ ] Set up regular backups (if needed)

## 🎉 Completion

Once all items are checked:
- [ ] Authentication is fully configured
- [ ] All sign-in methods work
- [ ] Data persists correctly
- [ ] Security rules are in place
- [ ] Ready for development/production use

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
2. Review Firebase Console for errors
3. Check browser console for error messages
4. Verify all environment variables are set correctly
5. Create an issue on GitHub if problem persists

---

**Setup Date**: _______________  
**Completed By**: _______________  
**Notes**: _______________________________________________
