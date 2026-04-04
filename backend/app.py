from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
import shutil
import os
import uuid
from typing import Tuple
import logging
from pathlib import Path

# Import our ML module logic
# Supports both:
#   - `uvicorn backend.app:app` (package import)
#   - `python backend/app.py` (script execution)
try:
    from .ml_model import load_model_global, predict_complaint, rule_based_reject_reason
except ImportError:  # pragma: no cover
    from ml_model import load_model_global, predict_complaint, rule_based_reject_reason

# Firebase integration (Admin SDK)
try:
    from .firebase_service import create_report_in_firestore_external_image, init_firebase
except ImportError:  # pragma: no cover
    from firebase_service import create_report_in_firestore_external_image, init_firebase

# Cloudinary integration
try:
    from .cloudinary_service import upload_image_to_cloudinary
except ImportError:  # pragma: no cover
    from cloudinary_service import upload_image_to_cloudinary

app = FastAPI(title="Complaint Upload API with ML Filtering")

logger = logging.getLogger(__name__)


def _load_env_file(path: Path) -> None:
    """Load KEY=VALUE pairs into os.environ if not already set.

    Keeps secrets out of source by allowing `secrets/backend.env`.
    """

    try:
        if not path.exists() or not path.is_file():
            return

        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if not key:
                continue
            os.environ.setdefault(key, value)
    except Exception:
        # Never block app startup due to optional env file.
        return


# Optional local env file for backend secrets/config.
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_ENV_FILE = _PROJECT_ROOT / "secrets" / "backend.env"
_load_env_file(Path(os.environ.get("BACKEND_ENV_FILE", str(_DEFAULT_ENV_FILE))))

TEMP_UPLOAD_DIR = "temp_uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

# Maximum allowed upload size (in bytes). Large images are resized to 224x224 for ML,
# but we still cap request size to protect server memory/bandwidth.
MAX_UPLOAD_MB = float(os.environ.get("MAX_UPLOAD_MB", "15"))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)


async def _save_upload_to_temp_file(upload: UploadFile, *, allowed_extensions: set[str]) -> Tuple[str, str]:
    """Save UploadFile to disk and enforce size limit.

    Returns: (temp_file_path, file_ext)
    """
    if upload is None:
        raise HTTPException(status_code=400, detail="Missing image file.")

    file_ext = os.path.splitext(upload.filename or "")[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(sorted(allowed_extensions))}",
        )

    temp_filename = f"{uuid.uuid4()}{file_ext}"
    temp_file_path = os.path.join(TEMP_UPLOAD_DIR, temp_filename)

    bytes_written = 0
    with open(temp_file_path, "wb") as buffer:
        while True:
            chunk = await upload.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            bytes_written += len(chunk)
            if bytes_written > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Max allowed is {MAX_UPLOAD_MB:.0f} MB.",
                )
            buffer.write(chunk)

    return temp_file_path, file_ext


@app.on_event("startup")
def _startup_load_ml_model():
    """Load the ML model once at server startup (performance requirement)."""
    load_model_global()


@app.on_event("startup")
def _startup_init_firebase():
    """Initialize Firebase Admin once at startup (performance requirement)."""
    # Reads FIREBASE_SERVICE_ACCOUNT and FIREBASE_STORAGE_BUCKET env vars.
    try:
        init_firebase()
    except Exception as e:
        # Allow the API to start so /complaints/verify works even when
        # Firebase isn't configured yet.
        logger.warning("Firebase not initialized (%s). Genuine uploads will not be persisted.", e)


@app.on_event("startup")
def _startup_warn_cloudinary_if_missing():
    # Cloudinary is required to persist images in the current architecture.
    has_url = bool(os.environ.get("CLOUDINARY_URL"))
    has_split = all(
        os.environ.get(k)
        for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")
    )
    if not (has_url or has_split):
        logger.warning(
            "Cloudinary is not configured. Genuine uploads will be verified but NOT saved. "
            "Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET (e.g. via secrets/backend.env)."
        )

@app.post("/complaints/upload")
async def upload_complaint(
    file: UploadFile = File(None),
    title: str = Form(""),
    description: str = Form(""),
    issueType: str = Form(""),
    lat: float = Form(0.0),
    lng: float = Form(0.0),
    uid: str = Form("guest"),
    userName: str = Form("Anonymous"),
):
    """
    API endpoint to handle complaint uploads.
    Integrates ML prediction to filter fake/spam complaints.
    """
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    temp_file_path = None
    file_ext = None
    
    try:
        # Save locally for ML processing (size-limited)
        temp_file_path, file_ext = await _save_upload_to_temp_file(file, allowed_extensions=allowed_extensions)

        # Quick heuristic rejection for obvious non-photos (logos/screenshots).
        reject_reason = rule_based_reject_reason(temp_file_path)
        if reject_reason:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "rejected",
                    "message": reject_reason,
                    "classification": "fake",
                    "confidence": 0,
                },
            )
            
        # 4. Integrate ML Prediction
        classification, confidence = predict_complaint(temp_file_path)
        
        # 5. Handle routing based on classification
        if classification == "fake":
            # Reject request
            return JSONResponse(
                status_code=400,
                content={
                    "status": "rejected",
                    "message": "Complaint rejected. Appears to be a non-genuine image.",
                    "confidence": round(confidence, 2)
                }
            )
            
        elif classification == "genuine":
            # Only after ML says "genuine" do we register into Firebase.
            complaint_status = "Approved"
            
        elif classification == "uncertain":
            # Allow the request but do NOT persist to Firebase.
            # This matches: "only if genuine then register into Firebase".
            return JSONResponse(
                status_code=202,
                content={
                    "status": "pending_review",
                    "message": "We could not verify this image as a civic issue confidently. Please retake a clear live photo showing the problem (pothole/garbage/streetlight/water leak, etc.).",
                    "classification": classification,
                    "confidence": round(confidence, 2),
                },
            )
        else:
            # Defensive fallback
            return JSONResponse(
                status_code=202,
                content={
                    "status": "pending_review",
                    "message": "Image could not be verified. Please upload a clearer photo.",
                    "classification": classification,
                    "confidence": round(confidence, 2),
                },
            )

        # 6. Save ONLY when ML says "genuine"
        try:
            image_url, image_meta = upload_image_to_cloudinary(local_image_path=temp_file_path, file_ext=file_ext)
            report_id = create_report_in_firestore_external_image(
                classification=classification,
                confidence=confidence,
                title=title or "",
                description=description or title or "",
                issue_type=issueType or "",
                lat=float(lat or 0.0),
                lng=float(lng or 0.0),
                uid=uid or "guest",
                user_name=userName or "Anonymous",
                image_url=image_url,
                image_meta=image_meta,
                audio_url=None,
            )
        except Exception as e:
            logger.exception("Genuine complaint verified but failed to persist")
            raise HTTPException(
                status_code=503,
                detail=(
                    "Verified as genuine, but the server could not save it right now. "
                    "Please try again in a moment."
                ),
            )

        return {
            "status": "success",
            "message": f"Complaint uploaded successfully. Status: {complaint_status}",
            "reportId": report_id,
            "imageURL": image_url,
            "classification": classification,
            "confidence": round(confidence, 2)
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        # Typically raised for invalid / unreadable images
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always close the upload stream and cleanup temp file.
        try:
            await file.close()
        except Exception:
            pass

        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass


@app.post("/complaints/verify")
async def verify_complaint_image(file: UploadFile = File(None)):
    """Verify an image with the ML model WITHOUT saving anything to Firebase.

    Intended usage: the mobile app calls this first; only if the result is
    "genuine" should the app proceed to save into the database.
    """
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    temp_file_path = None
    try:
        temp_file_path, _file_ext = await _save_upload_to_temp_file(file, allowed_extensions=allowed_extensions)

        # Quick heuristic rejection for obvious non-photos (logos/screenshots).
        reject_reason = rule_based_reject_reason(temp_file_path)
        if reject_reason:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "rejected",
                    "message": reject_reason,
                    "classification": "fake",
                    "confidence": 0,
                },
            )

        classification, confidence = predict_complaint(temp_file_path)

        if classification == "genuine":
            return {
                "status": "verified",
                "classification": classification,
                "confidence": round(confidence, 2),
            }

        if classification == "fake":
            return JSONResponse(
                status_code=400,
                content={
                    "status": "rejected",
                    "message": "Complaint rejected. Appears to be a non-genuine image.",
                    "classification": classification,
                    "confidence": round(confidence, 2),
                },
            )

        # uncertain or anything else => treat as not verified
        return JSONResponse(
            status_code=202,
            content={
                "status": "not_verified",
                "message": "We could not verify this image as a civic issue confidently. Please retake a clear live photo showing the problem (pothole/garbage/streetlight/water leak, etc.).",
                "classification": classification,
                "confidence": round(confidence, 2),
            },
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            await file.close()
        except Exception:
            pass

        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    # Start the server (Model will be loaded lazily on the first request)
    uvicorn.run(app, host="0.0.0.0", port=8000)
