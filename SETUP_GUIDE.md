# Sudhaar - Civic Reporting App

A comprehensive civic reporting mobile application built with React Native and Expo. Users can report civic issues like potholes, garbage, streetlights, and more with location tracking and community engagement features.

## Features

### ✅ Implemented
- **Authentication**: Google One-Tap Sign-In
- **Home Screen**: 
  - Personalized greeting with location
  - Quick action cards (Report Issue, Issues nearby, My Complaints, Alerts & News)
  - Nearby complaints feed
- **Report Issue Screen**:
  - Title and description input
  - Photo capture and gallery upload
  - Voice note recording
  - Automatic location detection
  - Category selection (Pothole, Garbage, Streetlight, Water Leak, Sewage Block, Other)
- **Map Screen**: Interactive map showing all reported issues with markers
- **Community Feed**:
  - View all reports from the community
  - Filter by status (Reported, Validated, Working, Completed)
  - Status progress indicator
  - Upvote/like system
- **Profile Screen**:
  - User profile information
  - Statistics (Total, Resolved, Pending reports)
  - My complaints list
  - Sign out functionality
- **Firebase Integration**:
  - Firestore for database
  - Firebase Auth for authentication
  - Firebase Storage for images and audio files

## Setup Instructions

### 1. Firebase Configuration

Update the Firebase configuration in `config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Get from Firebase Console
  authDomain: "sudhaar-e768e.firebaseapp.com",
  projectId: "sudhaar-e768e",
  storageBucket: "sudhaar-e768e.firebasestorage.app",
  messagingSenderId: "392414825023",
  appId: "YOUR_APP_ID" // Get from Firebase Console
};
```

### 2. Google Sign-In Configuration

The web client ID is already configured from your `google-services.json`:
```
392414825023-ju4lqpqrl8fprjbvcgfuopjhk0vgb4tn.apps.googleusercontent.com
```

### 3. Add SHA Keys for Android

1. Generate SHA-1 and SHA-256 keys:
   ```bash
   cd android
   ./gradlew signingReport
   ```

2. Add these SHA keys to your Firebase project:
   - Go to Firebase Console → Project Settings → Your Apps
   - Click on your Android app
   - Scroll down and click "Add fingerprint"
   - Add both SHA-1 and SHA-256

### 4. Google Maps API Key

Update the Google Maps API key in `app.json`:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

To get a Google Maps API key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps SDK for Android
3. Create an API key
4. Restrict it to your app's package name: `com.sudhaar.app`

### 5. Install Dependencies

Dependencies are already installed, but if needed:
```bash
npm install
```

### 6. Run the App

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

## Firebase Setup Required

### Enable Authentication
1. Go to Firebase Console → Authentication
2. Enable **Google** sign-in method
3. Add your app's SHA keys

### Enable Firestore
1. Go to Firebase Console → Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (or production mode with proper rules)
4. Select a location

### Enable Storage
1. Go to Firebase Console → Storage
2. Click "Get started"
3. Choose "Start in test mode" (or production mode with proper rules)

### Firestore Security Rules (Example)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reports/{reportId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }
  }
}
```

### Storage Security Rules (Example)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Project Structure

```
sudhaar/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── index.tsx        # Home screen
│   │   ├── report.tsx       # Report issue screen
│   │   ├── map.tsx          # Map view screen
│   │   ├── community.tsx    # Community feed screen
│   │   └── profile.tsx      # Profile screen
│   └── _layout.tsx          # Root layout
├── components/              # Reusable components
│   └── LoginScreen.tsx      # Login/Auth screen
├── config/                  # Configuration files
│   └── firebase.ts          # Firebase configuration
├── context/                 # React Context providers
│   └── AuthContext.tsx      # Authentication context
├── services/                # Service layer
│   ├── auth.service.ts      # Authentication services
│   ├── firestore.service.ts # Database operations
│   └── storage.service.ts   # File upload services
└── constants/               # App constants
    └── theme.ts             # Color theme
```

## Features in Screenshots

1. **Login Screen** - Google Sign-In with One-Tap
2. **Home Screen** - Dashboard with actions and nearby complaints
3. **Report Screen** - Form to report civic issues with evidence
4. **Map Screen** - Interactive map with issue markers
5. **Community Feed** - All reports with status tracking
6. **Profile Screen** - User profile and my complaints

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **UI**: React Native components with custom theming
- **Authentication**: Firebase Auth + Google Sign-In
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Maps**: React Native Maps (Google Maps)
- **Location**: Expo Location
- **Media**: Expo Image Picker, Expo AV

## Important Notes

1. **Production Build**: Before building for production, make sure to:
   - Update Firebase API keys
   - Add SHA keys for Android release build
   - Set proper Firestore and Storage security rules
   - Update Google Maps API key restrictions

2. **Location Permissions**: The app requires location permissions for:
   - Reporting issues with location
   - Showing nearby issues on map
   - Displaying user location

3. **Media Permissions**: Required for:
   - Camera access (taking photos)
   - Gallery access (selecting images)
   - Microphone access (voice notes)

## Support

For issues or questions:
- Check Firebase Console for any configuration errors
- Ensure all API keys are properly configured
- Verify permissions are granted in app settings

## License

Private project for Sudhaar civic reporting platform.
