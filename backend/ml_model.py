import json
import os
from pathlib import Path

import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from PIL import Image

# Load model globally at startup to avoid reloading on each request
BACKEND_DIR = Path(__file__).resolve().parent
MODEL_PATH = BACKEND_DIR / 'genuine_detector.h5'
CLASS_MAP_PATH = BACKEND_DIR / 'class_indices.json'
TARGET_SIZE = (224, 224)

# Decision thresholds
# Note: with small/biased datasets, the model can be over-confident on out-of-domain images.
# We therefore require BOTH a high probability and a good margin over the runner-up.
# Defaults are intentionally strict to avoid registering random/unrelated photos.
MIN_CONFIDENCE_FOR_DECISION = float(os.environ.get("MIN_CONFIDENCE_FOR_DECISION", "0.90"))
MIN_PROB_MARGIN = float(os.environ.get("MIN_PROB_MARGIN", "0.35"))
ACCEPT_GENUINE_THRESHOLD = float(os.environ.get("ACCEPT_GENUINE_THRESHOLD", "0.985"))
REJECT_FAKE_THRESHOLD = float(os.environ.get("REJECT_FAKE_THRESHOLD", "0.90"))

# Initialize model + metadata
_model = None
_index_to_label = None


def load_model_global():
    """Loads the model (and class mapping) into global memory exactly once."""
    global _model, _index_to_label

    if _model is not None:
        return

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found at {MODEL_PATH}. Train it first using train_model.py"
        )

    _model = load_model(str(MODEL_PATH))

    # Optional but recommended: use the saved class mapping from training.
    # If missing, we fall back to alphabetical ordering: ['fake', 'genuine'].
    if CLASS_MAP_PATH.exists():
        with open(CLASS_MAP_PATH, 'r', encoding='utf-8') as f:
            label_to_index = json.load(f)
        _index_to_label = {int(v): str(k) for k, v in label_to_index.items()}
    else:
        _index_to_label = {0: 'fake', 1: 'genuine'}

def get_model():
    """Returns the globally loaded model.

    The app should call `load_model_global()` during server startup.
    This function is still safe to call if startup hook was missed.
    """
    if _model is None:
        load_model_global()
    return _model

def preprocess_image(image_path):
    """
    Reads an image, resizes it to 224x224, converts to an array,
    expands dimensions, and applies MobileNetV2 preprocessing.
    """
    # Load and resize image (PIL decoding happens here)
    try:
        img = load_img(image_path, target_size=TARGET_SIZE)
    except Exception as e:
        raise ValueError(f"Invalid image file: {e}")
    
    # Convert image to numpy array
    img_array = img_to_array(img)
    
    # Expand dimensions to create a batch of 1: (1, 224, 224, 3)
    img_array = np.expand_dims(img_array, axis=0)
    
    # Apply MobileNetV2 specific preprocessing
    processed_img = preprocess_input(img_array)
    return processed_img


def rule_based_reject_reason(image_path: str) -> str | None:
    """Fast heuristic to reject obvious non-complaint images.

    This is not a replacement for the ML model. It exists to catch common
    false-positives like logos, icons, screenshots, and other graphics that are
    frequently misclassified as "genuine" by small datasets.

    Returns a user-friendly rejection reason, or None to proceed with ML.
    """
    try:
        with Image.open(image_path) as img:
            # Many icons/graphics have transparency; camera photos usually don't.
            has_alpha = (
                img.mode in {"RGBA", "LA"}
                or (img.mode == "P" and "transparency" in img.info)
                or ("transparency" in img.info)
            )
            if has_alpha:
                return (
                    "This image looks like a graphic/screenshot (transparent background). "
                    "Please take a real photo of the civic issue and try again."
                )

            # Measure "photo-likeness" via coarse color diversity + luminance entropy.
            rgb = img.convert("RGB").resize((128, 128))
            arr = np.asarray(rgb, dtype=np.uint8)

        # Quantize colors to reduce noise and count unique colors.
        quant = (arr // 32).astype(np.uint8)  # 0..7 per channel
        unique_colors = int(np.unique(quant.reshape(-1, 3), axis=0).shape[0])

        # Grayscale entropy (0..8 bits). Logos/flat graphics tend to be low.
        gray = (0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]).astype(np.uint8)
        hist = np.bincount(gray.reshape(-1), minlength=256).astype(np.float64)
        total = float(hist.sum())
        if total <= 0:
            return None
        prob = hist / total
        prob = prob[prob > 0]
        entropy = float(-np.sum(prob * np.log2(prob)))

        # Conservative thresholds: only reject when it strongly looks like a graphic.
        if unique_colors < 60 and entropy < 4.5:
            return (
                "This image looks like a logo/screenshot or non-photo. "
                "For trust and safety, we only accept clear real photos of the issue. "
                "Please retake the photo in good light and try again."
            )
    except Exception:
        # If the heuristic fails (unsupported format, etc.), fall back to ML.
        return None

    return None

def predict_complaint(image_path):
    """
    Predicts whether a complaint image is genuine or fake.
    Returns:
        tuple (status, confidence)
        status: "genuine", "fake", or "uncertain"
        confidence: float representing % confidence
    """
    model = get_model()
    processed_img = preprocess_image(image_path)
    
    # Predict the class probabilities
    predictions = model.predict(processed_img, verbose=0)[0]

    # Pick best class and map index -> label.
    best_index = int(np.argmax(predictions))
    best_prob = float(predictions[best_index])
    second_prob = float(np.partition(predictions, -2)[-2]) if len(predictions) >= 2 else 0.0
    margin = best_prob - second_prob

    # Default mapping if training metadata isn't available.
    label = (_index_to_label or {0: 'fake', 1: 'genuine'}).get(best_index, 'fake')

    # If the model isn't confident enough OR doesn't clearly separate the top-2 classes,
    # we treat it as "uncertain" and the app should ask the user to retake.
    if best_prob < MIN_CONFIDENCE_FOR_DECISION or margin < MIN_PROB_MARGIN:
        return "uncertain", best_prob * 100.0

    if label not in {"genuine", "fake"}:
        # Defensive fallback: if someone used different folder names.
        label = "genuine" if best_index == 1 else "fake"

    # Strict acceptance rules
    if label == "genuine":
        return ("genuine", best_prob * 100.0) if best_prob >= ACCEPT_GENUINE_THRESHOLD else ("uncertain", best_prob * 100.0)

    if label == "fake":
        return ("fake", best_prob * 100.0) if best_prob >= REJECT_FAKE_THRESHOLD else ("uncertain", best_prob * 100.0)

    return "uncertain", best_prob * 100.0
