# Quick Start Guide - Sudhaar App

## 🚀 Your app is ready! Here's what you need to do:

### 1. Get Your Firebase Web API Key

The Firebase API key in `config/firebase.ts` is currently a placeholder. Get your actual key:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **sudhaar-e768e**
3. Click Settings (⚙️) → Project Settings
4. Scroll to "Your apps" section
5. Find your Web app or create one
6. Copy the `apiKey` and replace in `config/firebase.ts`

### 2. Add SHA Keys for Google Sign-In

You mentioned you'll add SHA keys yourself. Here's how:

```bash
# Navigate to android directory
cd android

# Generate debug SHA keys
./gradlew signingReport

# Look for SHA1 and SHA-256 under "Variant: debug"
```

Then add them to Firebase:
- Firebase Console → Project Settings → Your Android App
- Scroll to "SHA certificate fingerprints"
- Click "Add fingerprint" and paste your SHA-1 and SHA-256

### 3. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project or create one
3. Enable "Maps SDK for Android"
4. Go to APIs & Services → Credentials
5. Create API Key
6. Restrict it to Android apps
7. Add your package name: `com.sudhaar.app`
8. Add SHA-1 fingerprint
9. Copy the API key and replace in `app.json`:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ACTUAL_MAPS_API_KEY_HERE"
    }
  }
}
```

### 4. Enable Firebase Services

#### Firestore Database:
1. Firebase Console → Firestore Database
2. Create Database → Start in test mode
3. Select location closest to you

#### Authentication:
1. Firebase Console → Authentication
2. Sign-in method tab
3. Enable Google provider
4. Save

#### Storage:
1. Firebase Console → Storage
2. Get Started → Start in test mode

### 5. Run the App

```bash
# Start the development server
npm start

# Then press:
# 'a' for Android
# 'i' for iOS
# 'w' for Web
```

### 6. Test the App

1. **Login**: Use Google Sign-In to authenticate
2. **Home**: View dashboard with your location and nearby issues
3. **Report**: Take a photo and report an issue
4. **Map**: See all issues on the map
5. **Community**: Browse all reports and upvote
6. **Profile**: View your statistics and complaints

## 📱 App Features

✅ **Authentication**: Google One-Tap Sign-In  
✅ **Home**: Dashboard with quick actions  
✅ **Report Issue**: Photo, voice notes, categories  
✅ **Map View**: Interactive map with markers  
✅ **Community Feed**: All reports with status tracking  
✅ **Profile**: User stats and my complaints  
✅ **Status Tracking**: Reported → Validated → Working → Completed  
✅ **Voting System**: Upvote important issues  
✅ **Location Tracking**: Automatic location detection  

## 🔐 Security Notes

The app is currently configured with Firebase test mode. Before deploying to production:

### Firestore Rules (Production):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reports/{reportId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
                   && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null;
      allow delete: if request.auth != null 
                   && resource.data.uid == request.auth.uid;
    }
  }
}
```

### Storage Rules (Production):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reports/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.auth.uid == userId;
    }
    match /audio/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.auth.uid == userId;
    }
  }
}
```

## 🐛 Troubleshooting

### "Location permission denied"
- Go to device Settings → Apps → Sudhaar → Permissions
- Enable Location permission

### "Camera permission denied"
- Go to device Settings → Apps → Sudhaar → Permissions
- Enable Camera and Storage permissions

### "Google Sign-In failed"
- Make sure SHA keys are added to Firebase
- Check if Google Sign-In is enabled in Authentication
- Verify package name is `com.sudhaar.app`

### "Map not showing"
- Add Google Maps API key in `app.json`
- Enable Maps SDK for Android in Google Cloud Console
- Rebuild the app after adding API key

## 📝 What's Next?

After basic setup:
1. Customize the app theme in `constants/theme.ts`
2. Add your app logo in `assets/images/`
3. Test on a real device for best experience
4. Configure production Firebase security rules
5. Add crash reporting (e.g., Sentry)
6. Set up push notifications for status updates

## Need Help?

Check the full documentation in [SETUP_GUIDE.md](./SETUP_GUIDE.md)
