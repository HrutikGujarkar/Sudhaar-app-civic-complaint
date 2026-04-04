import os
import json
import base64
import tempfile
from datetime import timedelta
from pathlib import Path
from typing import Any, Dict, Optional

import firebase_admin
from firebase_admin import credentials, firestore, storage
from google.cloud.firestore_v1 import GeoPoint

# Firebase Admin is initialized once and reused across requests.
_app: Optional[firebase_admin.App] = None
_db: Optional[firestore.Client] = None
_bucket = None


def _resolve_service_account_path() -> Path:
    """Resolve Firebase Admin service account credentials.

    Supported inputs (first match wins):
      1) FIREBASE_SERVICE_ACCOUNT: path to a JSON file (Render Secret File path recommended)
      2) FIREBASE_SERVICE_ACCOUNT_JSON: raw JSON string
      3) FIREBASE_SERVICE_ACCOUNT_B64: base64-encoded JSON
    """

    service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if service_account_path:
        return Path(service_account_path).expanduser().resolve()

    raw_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if raw_json:
        # Validate it is JSON before writing.
        json.loads(raw_json)
        temp_dir = Path(tempfile.gettempdir())
        out = temp_dir / "firebase-service-account.json"
        out.write_text(raw_json, encoding="utf-8")
        return out

    b64 = os.environ.get("FIREBASE_SERVICE_ACCOUNT_B64")
    if b64:
        decoded = base64.b64decode(b64).decode("utf-8")
        json.loads(decoded)
        temp_dir = Path(tempfile.gettempdir())
        out = temp_dir / "firebase-service-account.json"
        out.write_text(decoded, encoding="utf-8")
        return out

    raise RuntimeError(
        "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT to a JSON file path "
        "(recommended on Render via Secret Files), or set FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_SERVICE_ACCOUNT_B64."
    )


def init_firebase() -> None:
    """Initialize Firebase Admin SDK exactly once.

    Required env vars:
      - FIREBASE_SERVICE_ACCOUNT: absolute/relative path to a service account JSON
      - FIREBASE_STORAGE_BUCKET: your bucket name, e.g. "my-project.appspot.com"

    Notes:
      - `google-services.json` (Android) is NOT the admin credential.
      - Never commit the service account key JSON to git.
    """

    global _app, _db, _bucket
    if _app is not None:
        return

    bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET")

    service_account_path = _resolve_service_account_path()
    if not service_account_path.exists():
        raise RuntimeError(f"Firebase service account JSON not found: {service_account_path}")

    cred = credentials.Certificate(str(service_account_path))
    init_options: Dict[str, Any] = {}
    if bucket_name:
        init_options["storageBucket"] = bucket_name

    _app = firebase_admin.initialize_app(cred, init_options)

    _db = firestore.client(_app)
    _bucket = storage.bucket(app=_app) if bucket_name else None


def _require_init() -> None:
    if _app is None or _db is None:
        init_firebase()


def _require_bucket() -> None:
    _require_init()
    if _bucket is None:
        raise RuntimeError(
            "Firebase Storage bucket is not configured. Set FIREBASE_STORAGE_BUCKET "
            "or switch to Cloudinary/external image storage."
        )


def create_complaint_in_firebase(
    *,
    local_image_path: str,
    file_ext: str,
    classification: str,
    confidence: float,
    status: str,
    extra_fields: Optional[Dict[str, Any]] = None,
) -> str:
    """Uploads the image to Firebase Storage and creates a Firestore complaint doc.

    Returns:
      - complaint_id (Firestore document id)

    The created Firestore document contains:
      - status: "Approved" | "Needs Review"
      - ml: {classification, confidence}
      - image: {bucket, path, gsUri}
      - createdAt: server timestamp
    """

    _require_bucket()
    assert _db is not None
    assert _bucket is not None

    complaints = _db.collection("complaints")
    doc_ref = complaints.document()  # auto id
    complaint_id = doc_ref.id

    # Upload image into a predictable location.
    storage_path = f"complaints/{complaint_id}/image{file_ext}"
    blob = _bucket.blob(storage_path)

    # Basic content-type mapping.
    content_type = "image/jpeg" if file_ext in {".jpg", ".jpeg"} else "image/png"

    blob.upload_from_filename(local_image_path, content_type=content_type)

    gs_uri = f"gs://{_bucket.name}/{storage_path}"

    doc: Dict[str, Any] = {
        "status": status,
        "ml": {
            "classification": classification,
            "confidence": float(confidence),
        },
        "image": {
            "bucket": _bucket.name,
            "path": storage_path,
            "gsUri": gs_uri,
        },
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    if extra_fields:
        doc.update(extra_fields)

    doc_ref.set(doc)

    return complaint_id


def create_report_in_firebase(
    *,
    local_image_path: str,
    file_ext: str,
    classification: str,
    confidence: float,
    title: str,
    description: str,
    issue_type: str,
    lat: float,
    lng: float,
    uid: str,
    user_name: str,
    audio_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a 'reports' document (matching the mobile app) and upload its image.

    Returns:
      - {reportId, imageURL}
    """

    _require_bucket()
    assert _db is not None
    assert _bucket is not None

    reports = _db.collection("reports")
    doc_ref = reports.document()  # auto id
    report_id = doc_ref.id

    storage_path = f"reports/{uid or 'guest'}/{report_id}/image{file_ext}"
    blob = _bucket.blob(storage_path)

    content_type = "image/jpeg" if file_ext in {".jpg", ".jpeg"} else "image/png"
    blob.upload_from_filename(local_image_path, content_type=content_type)

    # Long-lived signed URL so the app can display the image directly.
    image_url: Optional[str] = None
    try:
        image_url = blob.generate_signed_url(expiration=timedelta(days=3650), method="GET")
    except Exception:
        image_url = None

    doc: Dict[str, Any] = {
        "title": title,
        "description": description,
        "type": issue_type,
        "location": GeoPoint(float(lat), float(lng)),
        "imageURL": image_url,
        "audioURL": audio_url,
        "uid": uid,
        "userName": user_name,
        "timestamp": firestore.SERVER_TIMESTAMP,
        "status": 0,
        "votedBy": [],
        "ml": {
            "classification": classification,
            "confidence": float(confidence),
        },
        "image": {
            "bucket": _bucket.name,
            "path": storage_path,
            "gsUri": f"gs://{_bucket.name}/{storage_path}",
        },
    }

    doc_ref.set(doc)

    return {"reportId": report_id, "imageURL": image_url}


def create_report_in_firestore_external_image(
    *,
    classification: str,
    confidence: float,
    title: str,
    description: str,
    issue_type: str,
    lat: float,
    lng: float,
    uid: str,
    user_name: str,
    image_url: str,
    image_meta: Optional[Dict[str, Any]] = None,
    audio_url: Optional[str] = None,
) -> str:
    """Create a reports doc in Firestore referencing an external image URL (e.g., Cloudinary)."""

    _require_init()
    assert _db is not None

    reports = _db.collection("reports")
    doc_ref = reports.document()
    report_id = doc_ref.id

    doc: Dict[str, Any] = {
        "title": title,
        "description": description,
        "type": issue_type,
        "location": GeoPoint(float(lat), float(lng)),
        "imageURL": image_url,
        "audioURL": audio_url,
        "uid": uid,
        "userName": user_name,
        "timestamp": firestore.SERVER_TIMESTAMP,
        "status": 0,
        "votedBy": [],
        "ml": {
            "classification": classification,
            "confidence": float(confidence),
        },
    }

    if image_meta:
        doc["image"] = image_meta

    doc_ref.set(doc)
    return report_id
