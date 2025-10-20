
import asyncio
import logging
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import python_weather
import aiohttp
import os
import nest_asyncio
import joblib
import pickle
import numpy as np
from keras.models import load_model
from keras.preprocessing import image
from flask_cors import CORS
import requests





# Flask setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": os.getenv("FRONTEND_URL", "http://localhost:3000")}})

@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"message": "✅ Backend connection OK"}), 200


# Logging setup
logging.basicConfig(
    level=logging.DEBUG,  # Changed to DEBUG for more details
    filename="app.log",
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route("/weather", methods=["GET"])
def get_weather():
    try:
        city_name = request.args.get("city")
        if not city_name:
            return jsonify({"error": "City parameter is required"}), 400

        # Get city coordinates using Open-Meteo geocoding API
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city_name}&count=1"
        geo_res = requests.get(geo_url).json()

        if "results" not in geo_res or len(geo_res["results"]) == 0:
            return jsonify({"error": f"City '{city_name}' not found"}), 404

        lat = geo_res["results"][0]["latitude"]
        lon = geo_res["results"][0]["longitude"]

        # Fetch weather data
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        weather_res = requests.get(weather_url).json()

        if "current_weather" not in weather_res:
            return jsonify({"error": f"No weather data available for '{city_name}'"}), 404

        current = weather_res["current_weather"]

        return jsonify({
            "city": city_name,
            "latitude": lat,
            "longitude": lon,
            "temperature": current["temperature"],
            "windspeed": current["windspeed"],
            "weathercode": current["weathercode"],
            "time": current["time"]
        })

    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
# ---------------- ADVANCED ML YIELD FORECAST ----------------
print("🔹 Loading ML models...")

def safe_load(path):
    """Try joblib first, fall back to pickle if needed."""
    try:
        return joblib.load(path)
    except Exception:
        try:
            with open(path, "rb") as f:
                return pickle.load(f)
        except Exception as e:
            logger.error("Failed to load file %s: %s", path, e)
            return None

# Load advanced ML model and encoders
adv_model, scaler, item_encoder = None, None, None
try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODEL_DIR = os.path.join(BASE_DIR, "models")
    adv_model = safe_load(os.path.join(MODEL_DIR, "pesticide_yield_model.pkl"))
    scaler = safe_load(os.path.join(MODEL_DIR, "scaler.pkl"))
    item_encoder = safe_load(os.path.join(MODEL_DIR, "item_encoder.pkl"))

    if adv_model and scaler and item_encoder:
        print("✅ All ML models loaded successfully")
    else:
        print("⚠️ Some ML model components failed to load")
except Exception as e:
    print("⚠️ Could not load advanced ML models:", e)

# ---------------- YIELD PREDICTION ----------------

print("adv_model:", adv_model)
print("scaler:", scaler)
print("item_encoder:", item_encoder)

@app.route("/predict_yield", methods=["POST"])
def predict_yield():
    try:
        # Check models
        if not all([adv_model, scaler]):
            return jsonify({"error": "ML model or scaler not available"}), 500

        # Get JSON data
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        # Validate required fields
        required_keys = ["area", "production"]
        for key in required_keys:
            if key not in data:
                return jsonify({"error": f"Missing key '{key}'"}), 400

        # Convert numeric values safely
        try:
            area_value = float(data["area"])
            production = float(data["production"])
        except (ValueError, TypeError):
            return jsonify({"error": "Area and production must be valid numbers"}), 400

        # Prepare input (area + production)
        input_data = np.array([[area_value, production]])

        # Scale the data if scaler is available
        try:
            input_scaled = scaler.transform(input_data)
        except Exception as e:
            logger.warning("Scaling failed, using raw input: %s", e)
            input_scaled = input_data

        # Predict yield
        prediction = adv_model.predict(input_scaled)[0]

        logger.info("Yield prediction for area %.2f ha: %.2f", area_value, prediction)

        # Return result
        return jsonify({
            "input": data,
            "predicted_yield": float(prediction)
        })

    except Exception as e:
        logger.error("Yield prediction error: %s", e)
        return jsonify({
            "error": "Internal error during prediction",
            "details": str(e)
        }), 500

# ---------------- DISEASE DETECTION (KERAS MODEL) ----------------
try:
    MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    DISEASE_MODEL_PATH = os.path.join(MODEL_DIR, "disease_detection_model.keras")  # or .h5
    disease_model = load_model(DISEASE_MODEL_PATH)
    logger.info("✅ Disease detection model loaded successfully")
except Exception as e:
    disease_model = None
    logger.error("⚠️ Could not load disease model: %s", e)
    print("⚠️ Disease model load error:", e)

# Reverse mapping from index → class name
DISEASE_CLASSES = {
    0: "Apple - Apple scab",
    1: "Apple - Black rot",
    2: "Apple - Cedar apple rust",
    3: "Apple - Healthy",
    4: "Blueberry - Healthy",
    5: "Cherry (including sour) - Powdery mildew",
    6: "Cherry (including sour) - Healthy",
    7: "Corn (maize) - Cercospora leaf spot / Gray leaf spot",
    8: "Corn (maize) - Common rust",
    9: "Corn (maize) - Northern Leaf Blight",
    10: "Corn (maize) - Healthy",
    11: "Grape - Black rot",
    12: "Grape - Esca (Black Measles)",
    13: "Grape - Leaf blight (Isariopsis Leaf Spot)",
    14: "Grape - Healthy",
    15: "Orange - Haunglongbing (Citrus greening)",
    16: "Peach - Bacterial spot",
    17: "Peach - Healthy",
    18: "Pepper (bell) - Bacterial spot",
    19: "Pepper (bell) - Healthy",
    20: "Potato - Early blight",
    21: "Potato - Late blight",
    22: "Potato - Healthy",
    23: "Raspberry - Healthy",
    24: "Soybean - Healthy",
    25: "Squash - Powdery mildew",
    26: "Strawberry - Leaf scorch",
    27: "Strawberry - Healthy",
    28: "Tomato - Bacterial spot",
    29: "Tomato - Early blight",
    30: "Tomato - Late blight",
    31: "Tomato - Leaf Mold",
    32: "Tomato - Septoria leaf spot",
    33: "Tomato - Spider mites (Two-spotted spider mite)",
    34: "Tomato - Target Spot",
    35: "Tomato - Yellow Leaf Curl Virus",
    36: "Tomato - Mosaic Virus",
    37: "Tomato - Healthy"
}


@app.route("/predict_disease", methods=["POST"])
def predict_disease():
    try:
        if disease_model is None:
            return jsonify({"error": "Disease model not available"}), 500

        if "file" not in request.files:
            return jsonify({"error": "No image file uploaded"}), 400

        file = request.files["file"]
        upload_dir = os.path.join(os.getcwd(), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        img_path = os.path.join(upload_dir, file.filename)
        file.save(img_path)

        # Preprocess image
        img = image.load_img(img_path, target_size=(128, 128))

        img_array = image.img_to_array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Predict
        preds = disease_model.predict(img_array)
        predicted_class = int(np.argmax(preds))
        confidence = float(np.max(preds))
        return jsonify({
    "predicted_class": DISEASE_CLASSES.get(predicted_class, "Unknown Disease"),
    "confidence": confidence})

    except Exception as e:
        logger.error("Disease prediction error: %s", e)
        return jsonify({"error": "Internal error during prediction", "details": str(e)}), 500

# ---------------- ERROR HANDLERS ----------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error("Server error: %s", e)
    return jsonify({"error": "Internal server error"}), 500

# ---------------- MAIN ----------------
@app.route("/")
def index():
    return "🌱 Flask API for Crop Prediction, Weather & Auth is running!"

# Set Windows event loop policy globally if needed
if os.name == "nt":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

if __name__ == "__main__":
    import nest_asyncio
    nest_asyncio.apply()

if os.name == "nt":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


    print("✅ Backend starting on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=True)
