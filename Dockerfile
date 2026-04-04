# Render-friendly Dockerfile for the FastAPI + TensorFlow backend
# Builds from repo root.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps (Pillow / SciPy wheels generally OK; keep minimal)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install Python deps first for better Docker caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN python -m pip install --upgrade pip \
  && pip install -r /app/backend/requirements.txt

# Copy backend code + model
COPY backend /app/backend

# Ensure temp upload dir exists (ephemeral on Render)
RUN mkdir -p /app/temp_uploads

ENV TEMP_UPLOAD_DIR=/app/temp_uploads

# Render sets $PORT
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
