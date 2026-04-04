import os
from pathlib import Path
from typing import Any, Dict, Tuple

import cloudinary
import cloudinary.uploader


def _init_cloudinary() -> None:
    """Initialize Cloudinary from env.

    Supported env vars:
      - CLOUDINARY_URL (recommended), e.g. cloudinary://<api_key>:<api_secret>@<cloud_name>

    Or the expanded form:
      - CLOUDINARY_CLOUD_NAME
      - CLOUDINARY_API_KEY
      - CLOUDINARY_API_SECRET
    """

    def _load_env_file(path: Path) -> None:
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
            return

    def _ensure_env_loaded() -> None:
        # Best-effort: allow local `secrets/backend.env` without requiring a restart.
        project_root = Path(__file__).resolve().parents[1]
        default_env = project_root / "secrets" / "backend.env"
        env_path = Path(os.environ.get("BACKEND_ENV_FILE", str(default_env)))
        _load_env_file(env_path)

    cloudinary_url = os.environ.get("CLOUDINARY_URL")
    if cloudinary_url:
        cloudinary.config(cloudinary_url=cloudinary_url, secure=True)
        return

    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")

    if not (cloud_name and api_key and api_secret):
        _ensure_env_loaded()
        cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
        api_key = os.environ.get("CLOUDINARY_API_KEY")
        api_secret = os.environ.get("CLOUDINARY_API_SECRET")

    if not (cloud_name and api_key and api_secret):
        raise RuntimeError(
            "Cloudinary is not configured. Set CLOUDINARY_URL (recommended) "
            "or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET."
        )

    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)


def upload_image_to_cloudinary(*, local_image_path: str, file_ext: str) -> Tuple[str, Dict[str, Any]]:
    """Upload a local image file to Cloudinary.

    Returns:
      - (secure_url, metadata)
    """

    _init_cloudinary()

    folder = os.environ.get("CLOUDINARY_FOLDER", "sudhaar/reports")

    result = cloudinary.uploader.upload(
        local_image_path,
        folder=folder,
        resource_type="image",
        use_filename=True,
        unique_filename=True,
    )

    secure_url = str(result.get("secure_url") or "")
    if not secure_url:
        raise RuntimeError("Cloudinary upload returned no secure_url")

    meta: Dict[str, Any] = {
        "provider": "cloudinary",
        "public_id": result.get("public_id"),
        "asset_id": result.get("asset_id"),
        "version": result.get("version"),
        "format": result.get("format"),
        "bytes": result.get("bytes"),
        "width": result.get("width"),
        "height": result.get("height"),
        "resource_type": result.get("resource_type"),
        "url": result.get("url"),
        "secure_url": secure_url,
        "original_filename": result.get("original_filename"),
        "file_ext": file_ext,
    }

    return secure_url, meta
