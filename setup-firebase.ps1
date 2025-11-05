# AI Image Studio - Firebase Authentication Setup Script
# This script helps you set up the .env file with your Firebase credentials

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "AI Image Studio - Firebase Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path .env) {
    Write-Host ".env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit
    }
}

Write-Host "Please enter your Firebase configuration values." -ForegroundColor Green
Write-Host "You can find these in Firebase Console > Project Settings > Your Apps" -ForegroundColor Gray
Write-Host ""

# Collect Firebase credentials
$apiKey = Read-Host "Firebase API Key"
$authDomain = Read-Host "Auth Domain (e.g., your-project.firebaseapp.com)"
$projectId = Read-Host "Project ID"
$storageBucket = Read-Host "Storage Bucket (e.g., your-project.appspot.com)"
$messagingSenderId = Read-Host "Messaging Sender ID"
$appId = Read-Host "App ID"

Write-Host ""
$geminiKey = Read-Host "Gemini API Key (optional, press Enter to skip)"

# Create .env file
$envContent = @"
# Firebase Configuration
VITE_FIREBASE_API_KEY=$apiKey
VITE_FIREBASE_AUTH_DOMAIN=$authDomain
VITE_FIREBASE_PROJECT_ID=$projectId
VITE_FIREBASE_STORAGE_BUCKET=$storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=$messagingSenderId
VITE_FIREBASE_APP_ID=$appId

# Gemini API Key
GEMINI_API_KEY=$geminiKey
VITE_GEMINI_API_KEY=$geminiKey
"@

$envContent | Out-File -FilePath .env -Encoding utf8

Write-Host ""
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure you've enabled authentication methods in Firebase Console" -ForegroundColor White
Write-Host "   - Email/Password" -ForegroundColor Gray
Write-Host "   - Google Sign-In" -ForegroundColor Gray
Write-Host "   - Phone Authentication" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Set up Firestore database and security rules" -ForegroundColor White
Write-Host ""
Write-Host "3. Run 'yarn dev' or 'npm run dev' to start the development server" -ForegroundColor White
Write-Host ""
Write-Host "For detailed setup instructions, see FIREBASE_SETUP.md" -ForegroundColor Yellow
Write-Host ""
