import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import { getPlayerSigned } from "../services/jestService";
import "./LoginPage.css";

const SERVER_URL =
  process.env.REACT_APP_SERVER_URL ||
  `http://${window.location.hostname}:5002`;

const COUNTRIES = [
  { name: "India", flag: "🇮🇳" },
  { name: "United States", flag: "🇺🇸" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "France", flag: "🇫🇷" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Singapore", flag: "🇸🇬" },
  { name: "South Africa", flag: "🇿🇦" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Other", flag: "🌍" },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const navigate = useNavigate();
  const { player, savedProfile, login, saveProfile } = useJest();

  // If the player is already registered AND has a saved profile → auto-redirect
  useEffect(() => {
    if (player?.registered && savedProfile?.username) {
      navigate("/home", { replace: true });
    }
  }, [player, savedProfile, navigate]);

  const selectedCountry = COUNTRIES.find((c) => c.name === country);
  const initials = username
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // "Enter Arena" — triggers Jest platform login, then saves profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !country) return;

    setLoggingIn(true);
    try {
      // Trigger Jest platform registration (SMS/RCS popup)
      await login();
      // Save profile to Jest data store + sessionStorage
      saveProfile(username.trim(), country);

      // Register user in Firebase via server
      const { playerSigned } = await getPlayerSigned();
      await fetch(`${SERVER_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerSignedToken: playerSigned,
          username: username.trim(),
          country,
        }),
      });

      navigate("/home");
    } catch (err) {
      console.error("[LoginPage] Login failed:", err);
      // If login was dismissed or failed, still let them proceed
      // (they remain a guest but keep the entered username)
      saveProfile(username.trim(), country);
      navigate("/home");
    } finally {
      setLoggingIn(false);
    }
  };

  // "Play as Guest" — skip registration, use entered username or generate one
  const handleGuestPlay = () => {
    const guestName = username.trim() || `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
    const guestCountry = country || "Other";
    saveProfile(guestName, guestCountry);
    navigate("/home");
  };

  const isReady = username.trim().length > 0 && country.length > 0;

  return (
    <div className="page">
      <div className="card glass login-card">
        {/* Decorative orbs */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        {/* Avatar preview */}
        <div className="login-avatar-wrapper">
          <div className={`login-avatar ${initials ? "login-avatar-active" : ""}`}>
            {initials || "?"}
          </div>
          {selectedCountry && (
            <span className="login-avatar-flag">{selectedCountry.flag}</span>
          )}
        </div>

        <h1 className="title">Welcome, Player</h1>
        <p className="subtitle">
          Set up your profile to enter the arena
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Username field */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-username">
              <span className="login-label-icon">👤</span>
              Username
            </label>
            <input
              id="login-username"
              className="input"
              type="text"
              placeholder="Choose a display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoComplete="off"
              disabled={loggingIn}
            />
          </div>

          {/* Country field */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-country">
              <span className="login-label-icon">🌐</span>
              Country
            </label>
            <div className="login-select-wrapper">
              <select
                id="login-country"
                className="input login-select"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={loggingIn}
              >
                <option value="" disabled>
                  Select your country
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.flag}  {c.name}
                  </option>
                ))}
              </select>
              <span className="login-select-chevron">▾</span>
            </div>
          </div>

          {/* Register + Enter */}
          <button
            type="submit"
            className={`btn btn-primary login-btn ${isReady && !loggingIn ? "login-btn-ready" : ""}`}
            disabled={!isReady || loggingIn}
          >
            {loggingIn ? (
              <>
                <span className="btn-loader" />
                Registering…
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                Enter Arena
              </>
            )}
          </button>

          {/* Guest option */}
          <button
            type="button"
            className="btn btn-ghost login-guest-btn"
            onClick={handleGuestPlay}
            disabled={loggingIn}
          >
            Play as Guest
          </button>
        </form>

        <p className="login-footer">
          Join thousands of trivia champions worldwide
        </p>
      </div>
    </div>
  );
}
