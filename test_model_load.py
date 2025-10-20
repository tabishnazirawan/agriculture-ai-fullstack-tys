from tensorflow.keras.models import load_model
import os

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
DISEASE_MODEL_PATH = os.path.join(MODEL_DIR, "disease_detection_model.keras")  # change if your file name is different

print("🔹 Loading model from:", DISEASE_MODEL_PATH)
try:
    model = load_model(DISEASE_MODEL_PATH)
    print("✅ Model loaded successfully!")
except Exception as e:
    print("❌ Model load failed:", e)
