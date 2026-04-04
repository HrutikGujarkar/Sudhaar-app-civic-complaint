# Firebase backend (Python) setup

Your FastAPI backend uses **Firebase Admin SDK** to write complaints to:
- Firestore (create report record)

Images can be stored either in:
- Firebase Storage (optional)
- Cloudinary (recommended if you want a free-tier image CDN)

## 1) Create a Firebase service account key

1. Firebase Console → Project Settings → Service accounts
2. Click **Generate new private key**
3. Download the JSON key (example name: `serviceAccountKey.json`)

IMPORTANT: Do **not** commit this file to git.

## 2) Set required environment variables

Set these env vars before starting the backend:

- `FIREBASE_SERVICE_ACCOUNT` = path to the JSON key
- `FIREBASE_STORAGE_BUCKET` = (optional) your bucket name, usually `<project-id>.appspot.com`

### If using Cloudinary for images (recommended)

Set ONE of the following:

- `CLOUDINARY_URL` (recommended)
	- format: `cloudinary://<api_key>:<api_secret>@<cloud_name>`

OR set all three:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Optional:
- `CLOUDINARY_FOLDER` (default: `sudhaar/reports`)

### Windows PowerShell example

```
$env:FIREBASE_SERVICE_ACCOUNT = "D:\sudhaar\secrets\serviceAccountKey.json"

# If using Firebase Storage for images:
# $env:FIREBASE_STORAGE_BUCKET = "your-project-id.appspot.com"

# If using Cloudinary for images:
$env:CLOUDINARY_URL = "cloudinary://<api_key>:<api_secret>@<cloud_name>"
```

## 3) Run the backend

Install deps:

```
pip install -r backend/requirements.txt
```

Start API:

```
uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

## Upload size limits

The upload endpoint enforces a maximum image size to protect the server.

- Default max: **15 MB**
- Override with env var `MAX_UPLOAD_MB`

Example:

```
$env:MAX_UPLOAD_MB = "25"
```

## What gets written to Firebase

When an image is uploaded:
- ML model classifies it: `genuine` / `fake` / `uncertain`
- `fake` → request rejected (nothing written)
- `genuine` → stored in Firebase, status `Approved`
- `uncertain` → returns `202` and is NOT stored (client should ask for a clearer photo)

Firestore collection:
- `complaints/{complaintId}`

Storage path:
- `complaints/{complaintId}/image.jpg|png`
