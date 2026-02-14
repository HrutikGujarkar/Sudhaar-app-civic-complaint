# Firebase Deployment Script for Sudhaar App
# This script helps deploy Firestore and Storage rules to production

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Firebase Deployment for Sudhaar App" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "Checking Firebase CLI installation..." -ForegroundColor Yellow
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseInstalled) {
    Write-Host "❌ Firebase CLI is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Firebase CLI" -ForegroundColor Red
        Write-Host "Please run manually: npm install -g firebase-tools" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Firebase CLI installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✅ Firebase CLI is already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Logging into Firebase..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Login to Firebase
firebase login

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase login failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Deploying Rules to Production..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Deploy Firestore rules
Write-Host "Deploying Firestore rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules --project sudhar-app-6392d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Firestore rules!" -ForegroundColor Red
} else {
    Write-Host "✅ Firestore rules deployed successfully!" -ForegroundColor Green
}

Write-Host ""

# Deploy Storage rules
Write-Host "Deploying Storage rules..." -ForegroundColor Yellow
firebase deploy --only storage:rules --project sudhar-app-6392d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Storage rules!" -ForegroundColor Red
} else {
    Write-Host "✅ Storage rules deployed successfully!" -ForegroundColor Green
}

Write-Host ""

# Deploy Firestore indexes
Write-Host "Deploying Firestore indexes..." -ForegroundColor Yellow
firebase deploy --only firestore:indexes --project sudhar-app-6392d

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Firestore indexes deployment failed (this is optional)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Firestore indexes deployed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If database doesn't exist, create it in Firebase Console" -ForegroundColor White
Write-Host "   - Go to: https://console.firebase.google.com/project/sudhar-app-6392d/firestore" -ForegroundColor White
Write-Host "   - Click 'Create database' and choose Production mode" -ForegroundColor White
Write-Host "2. Test your app by submitting a report" -ForegroundColor White
Write-Host "3. Check Firebase Console to verify data is being saved" -ForegroundColor White
Write-Host ""
