import React, { useState, useCallback } from "react";
import vector from "../assets/vector.svg";
import home from "../assets/home.png";
import user from "../assets/User.svg";
import alertIcon from "../assets/alertIcon.svg";
import { Link } from "react-router-dom";
import { debounce } from "lodash";

function WeatherForecast() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

 
  const weatherCodeMap = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Freezing light drizzle",
    57: "Freezing dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing light rain",
    67: "Freezing heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };

  const getWeather = useCallback(
    debounce(async (cityName) => {
      if (!cityName.trim()) {
        setError("Please enter a valid city name");
        return;
      }

      setLoading(true);
      setError(null);
      setWeather(null);
      setAlertMsg("");

      try {
        const response = await fetch(`${API_URL}/weather?city=${encodeURIComponent(cityName)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          if (response.status === 400) {
            const data = await response.json();
            throw new Error(data.error || "Invalid request. Please check the city name.");
          }
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Weather data:", data);

        if (data.error) throw new Error(data.error);

        setWeather(data);
        generateAlert(data);
      } catch (error) {
        console.error("Error fetching weather:", error);
        if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
          setError("⚠️ Unable to connect to the server. Ensure Flask is running at http://localhost:5000.");
        } else {
          setError(error.message || "Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }, 500),
    [API_URL]
  );

  const generateAlert = (data) => {
    let alertText = "";
    const temp = data.temperature;
    const wind = data.windspeed;

    if (temp >= 40) {
      alertText = " High temperature! Irrigation required immediately.";
    } else if (temp <= 10) {
      alertText = " Low temperature! Protect crops from frost.";
    } else if (wind >= 10) {
      alertText = " High wind speeds! Secure light structures and plants.";
    } else {
      alertText = " Weather is stable. Continue regular field activities.";
    }

    setAlertMsg(alertText);
  };

  const handleCityChange = (e) => {
    const value = e.target.value;
    setCity(value);
    if (value.trim()) getWeather(value);
  };

  const handleClear = () => {
    setCity("");
    setWeather(null);
    setError(null);
    setAlertMsg("");
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col justify-between overflow-x-hidden bg-gray-900 font-sans">
      <div className="flex-grow">
        {/* Header */}
        <header className="flex flex-col items-center p-6 text-center">
          <img src={vector} alt="Agri-AI Logo" className="h-14 w-14 object-contain mb-2" />
          <h1 className="text-2xl font-bold text-white">Agri-AI</h1>
          <p className="text-sm text-white/70">Your smart farming assistant</p>
        </header>

        {/* Weather Card */}
        <main className="flex justify-center items-center mt-6 px-4">
          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg w-full max-w-md text-center">
            <h2 className="text-lg font-semibold text-white mb-4">Weather Forecast</h2>

            {/* City Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Enter city name"
                value={city}
                onChange={handleCityChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleClear}
                className="py-2 px-4 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition"
              >
                Clear
              </button>
            </div>

            {/* Loading Spinner */}
            {loading && (
              <div className="mt-4 flex justify-center">
                <div className="w-6 h-6 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Error Message */}
            {error && !loading && (
              <div className="mt-4 p-3 bg-red-600/30 rounded-lg text-red-300 text-sm text-left">
                <p>{error}</p>
              </div>
            )}

            {/* Weather Data */}
            {weather && !error && !loading && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg text-white text-sm text-left space-y-2">
                <p><strong> City:</strong> {weather.city}</p>
                <p><strong> Coordinates:</strong> {weather.latitude.toFixed(2)}, {weather.longitude.toFixed(2)}</p>
                <p><strong> Temperature:</strong> {weather.temperature}°C</p>
                <p><strong> Windspeed:</strong> {weather.windspeed} m/s</p>
                <p><strong> Time:</strong> {new Date(weather.time).toLocaleString()}</p>
                <p><strong> Condition:</strong> {weatherCodeMap[weather.weathercode] || "Unknown"}</p>
              </div>
            )}

            {/* Alerts */}
            {alertMsg && (
              <div
                className={`mt-4 p-3 rounded-lg text-white text-sm ${
                  alertMsg.includes("✅")
                    ? "bg-green-700/40"
                    : alertMsg.includes("🔥")
                    ? "bg-red-700/40"
                    : alertMsg.includes("❄️")
                    ? "bg-blue-700/40"
                    : "bg-yellow-700/40"
                }`}
              >
                <strong>⚠️ Alert:</strong> {alertMsg}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer / Navbar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm border-t border-green-600/30">
        <nav className="flex justify-around items-center pt-2 pb-3">
          <Link
            to="/"
            className="flex flex-col items-center justify-end gap-1 text-gray-400 hover:text-white transition"
          >
            <img src={home} alt="Home" className="h-8 w-10 object-contain" />
            <p className="text-xs font-medium">Home</p>
          </Link>
          <Link
            to="/Notification"
            className="flex flex-col items-center justify-end gap-1 text-gray-400 hover:text-white transition"
          >
            <img src={alertIcon} alt="Alerts" className="h-8 w-10 object-contain" />
            <p className="text-xs font-medium">Alerts</p>
          </Link>
          <Link
            to="/profile"
            className="flex flex-col items-center justify-end gap-1 text-gray-400 hover:text-white transition"
          >
            <img src={user} alt="Profile" className="h-8 w-10 object-contain" />
            <p className="text-xs font-medium">Profile</p>
          </Link>
        </nav>
      </footer>
    </div>
  );
}

export default WeatherForecast;
