# Firebase Setup Instructions

## Issue: Reports Not Submitting

If you're seeing "Failed to submit report" errors, it's likely due to Firebase permissions. Follow these steps:

## Step 1: Update Firestore Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **sudhar-app-6392d**
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Replace the existing rules with the content from `firestore.rules` file
6. Click **Publish**

## Step 2: Update Storage Rules

1. In Firebase Console, click on **Storage** in the left sidebar
2. Click on the **Rules** tab
3. Replace the existing rules with the content from `storage.rules` file
4. Click **Publish**

## Step 3: Test the App

1. Try submitting a report without an image first
2. If successful, try with an image
3. Check the Firebase Console under Firestore Database → Data to see if reports are being created

## Troubleshooting

### Error: "Permission denied"
- Make sure you've published the new rules in both Firestore and Storage
- Wait 1-2 minutes for rules to propagate

### Error: "Network error"
- Check internet connection
- Verify Firebase config in `config/firebase.ts`

### Error: "Image upload failed"
- The app will now ask if you want to continue without the image
- You can submit the report without media files

### Still Not Working?

Check the console logs:
1. Open terminal where you're running `npx expo start`
2. Look for error messages after clicking Submit
3. Common errors:
   - "Failed to fetch image" → Image URI is invalid
   - "storage/unauthorized" → Storage rules not updated
   - "permission-denied" → Firestore rules not updated

## Current Setup
confidential

## Security Note

The current rules allow anyone to create reports (including guests). In production, you may want to:
1. Require authentication for report creation
2. Add file size limits
3. Add rate limiting
4. Validate data structure
