# Train the ML model (Windows)

This repo’s backend uses **TensorFlow/Keras + MobileNetV2**.

## Important: Python version

TensorFlow currently does **not** install on Python 3.14. This machine shows only Python 3.14 installed.

To train the model, install **Python 3.11.x (64-bit)** and use a virtual environment.

## 1) Create a venv (Python 3.11)

From the repo root (`d:\sudhaar`):

```powershell
# Verify you have Python 3.11 installed
py -0p

# Create a venv using Python 3.11 (example path; adjust if your launcher shows a different tag)
py -3.11 -m venv .venv-ml

# NOTE: If your PowerShell blocks running Activate.ps1, you can skip activation
# and run the venv Python directly (recommended):
.\.venv-ml\Scripts\python.exe -m pip install --upgrade pip
```

## 2) Install backend dependencies

```powershell
# Option A (cross-platform):
.\.venv-ml\Scripts\python.exe -m pip install -r backend\requirements.txt

# If TensorFlow fails on Windows, use the Windows-specific requirements:
.\.venv-ml\Scripts\python.exe -m pip install -r backend\requirements-ml-windows.txt
```

## 3) Confirm dataset folders

Training reads images from:

- `data/train/genuine`
- `data/train/fake`
- `data/validation/genuine`
- `data/validation/fake`

## 4) Run training

```powershell
.\.venv-ml\Scripts\python.exe backend\train_model.py
```

Expected outputs:

- `backend/genuine_detector.h5`
- `backend/class_indices.json`

## 5) Run the API

```powershell
.\.venv-ml\Scripts\python.exe -m uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

## 6) Configure the mobile app

Set the backend URL for the app:

- `EXPO_PUBLIC_BACKEND_URL=http://<YOUR-LAN-IP>:8000`

Example:

- `EXPO_PUBLIC_BACKEND_URL=http://192.168.1.10:8000`

Then restart Expo (`npx expo start -c`).
