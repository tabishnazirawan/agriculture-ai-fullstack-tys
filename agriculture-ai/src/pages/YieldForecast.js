import React, { useState } from "react";
import vector from "../assets/vector.svg";
import home from "../assets/home.png";
import user from "../assets/User.svg";
import alertIcon from "../assets/alertIcon.svg";
import { Link } from "react-router-dom";

function YieldForecast() {
  const [area, setArea] = useState("");
  const [production, setProduction] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleForecast = async () => {
    if (!area || !production) {
      setError("Both area and production are required!");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/predict_yield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area: area.trim(),
          production: parseFloat(production),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
        setError("");
      } else {
        setError(data.error || "Something went wrong");
        setResult(null);
      }
    } catch (err) {
      setError("Backend not available. Check if server is running.");
      setResult(null);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col justify-between overflow-x-hidden bg-gray-900">
      <div className="flex-grow">
        {/* Header */}
        <header className="flex flex-col items-center p-6 text-center">
          <img src={vector} alt="Agri-AI Logo" className="h-14 w-14 object-contain mb-2" />
          <h1 className="text-2xl font-bold text-white">Agri-AI</h1>
          <p className="text-sm text-white/70">Your smart farming assistant</p>
        </header>

        {/* Card */}
        <div className="flex justify-center items-center px-4">
          <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-lg p-6 text-white">
            <h2 className="text-xl font-semibold mb-4 text-center">Crop Yield Forecast</h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter Area (Ha)"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-700 text-white outline-none"
              />
              <input
                type="number"
                placeholder="Enter Production (tons)"
                value={production}
                onChange={(e) => setProduction(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-700 text-white outline-none"
              />

              <button
                onClick={handleForecast}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg mt-2"
              >
                Get Yield Forecast
              </button>
            </div>

            {/* Result/Error */}
            {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
            {result && result.predicted_yield !== undefined && (
              <div className="mt-4 p-3 bg-gray-700 rounded-lg text-center">
                <p className="text-green-400 font-medium">
                  Predicted Yield: {result.predicted_yield.toFixed(2)} tons/ha
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Navbar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm border-t border-green-600/30">
        <nav className="flex justify-around items-center pt-2 pb-3">
          {/* Home */}
          <Link to="/" className="flex flex-col items-center justify-end gap-1 text-gray-400 cursor-pointer">
            <img src={home} alt="Home" className="h-8 w-10 object-contain" />
            <p className="text-xs font-medium">Home</p>
          </Link>

          {/* Alerts */}
          <Link
            to="/Notification"
            className="flex flex-col items-center justify-end gap-1 text-gray-400 cursor-pointer"
          >
            <img src={alertIcon} alt="alertIcon" className="h-8 w-10 object-contain" />
            <p className="text-xs font-medium">Alerts</p>
          </Link>

          {/* Profile */}
          <Link
            to="/profile"
            className="flex flex-col items-center justify-end gap-1 text-gray-400 cursor-pointer"
          >
            <img src={user} alt="Profile" className="h-8 w-10 object-contain" />
            <p className="text-xs font-medium">Profile</p>
          </Link>
        </nav>
      </footer>
    </div>
  );
}

export default YieldForecast;
