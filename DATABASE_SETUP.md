# Firebase Database Setup - Production Mode

## Quick Setup (Recommended)

### Option 1: Using Firebase Console (Easiest)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select project: `sudhar-app-6392d`

2. **Create Firestore Database**
   - Click "Firestore Database" in left menu
   - Click "Create database"
   - Choose **Production mode** (recommended) or Test mode
   - Select location: `asia-south1` (India) or nearest region
   - Click "Enable"

3. **Deploy Firestore Rules**
   - In Firestore, click "Rules" tab
   - Copy and paste content from `firestore.rules`
   - Click "Publish"

4. **Setup Firebase Storage**
   - Click "Storage" in left menu
   - Click "Get started"
   - Choose **Production mode**
   - Use same location as Firestore
   - Click "Done"

5. **Deploy Storage Rules**
   - In Storage, click "Rules" tab
   - Copy and paste content from `storage.rules`
   - Click "Publish"

✅ **Done!** Your database is ready in production mode.

---

## Option 2: Using Firebase CLI (Advanced)

### Prerequisites

Install Firebase CLI globally:
```powershell
npm install -g firebase-tools
```

### Steps

1. **Login to Firebase**
```powershell
firebase login
```

2. **Initialize Firebase (if needed)**
```powershell
firebase init
```
   - Select: Firestore, Storage
   - Use existing project: sudhar-app-6392d
   - Accept default file names

3. **Deploy Rules to Production**
```powershell
firebase deploy --only firestore:rules,storage:rules
```

4. **Deploy Indexes**
```powershell
firebase deploy --only firestore:indexes
```

### Verify Deployment
```powershell
firebase projects:list
```

---

## Production vs Test Mode

### **Production Mode** (Recommended)
- ✅ More secure
- ✅ Rules restrict access by default
- ✅ Better for real apps
- ⚠️ Requires proper rules configuration

### **Test Mode** (Not Recommended)
- ⚠️ Anyone can read/write for 30 days
- ⚠️ Automatically becomes restricted after 30 days
- ❌ Not secure
- ✅ Good for quick testing only

---

## What Happens After Setup

Once you create the database in **Production mode** and deploy the rules:

1. **Reports Collection** will be created automatically when first report is submitted
2. **Users can**:
   - Create reports (anyone, including guests)
   - Read all reports
   - Update/delete their own reports
3. **Storage allows**:
   - Upload images to `reports/{userId}/`
   - Upload audio to `audio/{userId}/`
   - Read all files

---

## Testing After Setup

1. Open your app
2. Try creating a report
3. Check Firebase Console → Firestore Database → Data
4. You should see a new document in the `reports` collection

---

## Troubleshooting

**Error: "Permission denied"**
- Make sure you published the rules
- Wait 1-2 minutes for rules to propagate

**Database not showing up**
- Refresh Firebase Console
- Make sure you selected the correct project

**Can't deploy via CLI**
- Run `firebase login` first
- Make sure you have owner/editor access to the project

---

## Security Notes

Current rules allow:
- ✅ Anyone can create reports (good for civic app)
- ✅ Users can only edit their own reports
- ✅ All reports are publicly readable

To make it more secure in the future:
- Require authentication for creating reports
- Add rate limiting
- Add file size validation

---

## Need Help?

If you encounter issues:
1. Check the Firebase Console for error messages
2. Look at browser/app console logs
3. Verify rules are published correctly
