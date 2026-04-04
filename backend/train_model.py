import json
from pathlib import Path

from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Configurations
IMG_SHAPE = (224, 224, 3)
BATCH_SIZE = 32
EPOCHS = 10

# Resolve paths relative to the repository root so the script works no matter
# where it's launched from.
REPO_ROOT = Path(__file__).resolve().parents[1]
TRAIN_DIR = REPO_ROOT / 'data' / 'train'
VALIDATION_DIR = REPO_ROOT / 'data' / 'validation'

# Save the model next to the backend code by default.
BACKEND_DIR = Path(__file__).resolve().parent
MODEL_SAVE_PATH = BACKEND_DIR / 'genuine_detector.h5'
CLASS_MAP_PATH = BACKEND_DIR / 'class_indices.json'


def _mobilenetv2_datagen_preprocess(x):
    """Applies MobileNetV2 preprocessing while still using rescale=1./255.

    Keras applies `rescale` before `preprocessing_function`.
    Because `mobilenet_v2.preprocess_input` expects 0..255 pixels, we convert
    the rescaled 0..1 pixels back to 0..255 first.
    """
    return preprocess_input(x * 255.0)

def build_model():
    """Builds the MobileNetV2-based classification model."""
    # Load MobileNetV2 base model with pre-trained ImageNet weights
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=IMG_SHAPE
    )

    # Freeze the base model layers so they aren't updated during training
    base_model.trainable = False

    # Add custom top layers for 2-class classification
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    predictions = Dense(2, activation='softmax')(x)

    # Combine base model and custom top layers
    model = Model(inputs=base_model.input, outputs=predictions)
    
    # Compile the model
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def train():
    """Prepares data generators and trains the model."""
    # Data augmentation for training data
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        preprocessing_function=_mobilenetv2_datagen_preprocess,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True
    )

    # Only rescaling for validation data
    val_datagen = ImageDataGenerator(
        rescale=1./255,
        preprocessing_function=_mobilenetv2_datagen_preprocess,
    )

    # Flow from directories
    train_generator = train_datagen.flow_from_directory(
        str(TRAIN_DIR),
        target_size=(IMG_SHAPE[0], IMG_SHAPE[1]),
        batch_size=BATCH_SIZE,
        class_mode='categorical'
    )

    validation_generator = val_datagen.flow_from_directory(
        str(VALIDATION_DIR),
        target_size=(IMG_SHAPE[0], IMG_SHAPE[1]),
        batch_size=BATCH_SIZE,
        class_mode='categorical'
    )

    model = build_model()

    # Train the model
    print("Starting training...")
    model.fit(
        train_generator,
        epochs=EPOCHS,
        validation_data=validation_generator
    )

    # Save the trained model
    model.save(str(MODEL_SAVE_PATH))
    print(f"Model saved successfully to {MODEL_SAVE_PATH}")

    # Persist class index mapping so inference can reliably map logits -> labels.
    # Example: {"fake": 0, "genuine": 1}
    with open(CLASS_MAP_PATH, 'w', encoding='utf-8') as f:
        json.dump(train_generator.class_indices, f, indent=2)
    print(f"Class index mapping saved to {CLASS_MAP_PATH}: {train_generator.class_indices}")

if __name__ == "__main__":
    train()
