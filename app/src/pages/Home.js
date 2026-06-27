import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import socket from "../socketConnection";

export default function Home() {
  const navigate = useNavigate();
  const { savedProfile, clearProfile } = useJest();
  const username = savedProfile?.username || "";

  // Guard: if no profile is saved send back to login
  useEffect(() => {
    if (!savedProfile?.username) {
      navigate("/", { replace: true });
    }
  }, [savedProfile, navigate]);

  const [showMultiOptions, setShowMultiOptions] = useState(false);

  const connectAndGo = (path) => {
    if (!username) return;
    if (!socket.connected) socket.connect();
    navigate(path, { state: { username } });
  };

  if (!username) return null;

  return (
    <div className="page">
      <div className="card glass">
        <div className="logo-icon">🧠</div>
        <h1 className="title">Multi Trivia</h1>
        <p className="subtitle">
          Welcome back, <strong>{username}</strong> 👋
        </p>
        <p className="subtitle" style={{ marginTop: 0, opacity: 0.7, fontSize: "0.9rem" }}>
          Choose your game mode
        </p>

        {!showMultiOptions ? (
          /* ── Mode Selection ── */
          <div className="btn-group">
            {/* Single Player */}
            <button
              className="btn btn-primary"
              onClick={() => alert("Single-Player mode coming soon!")}
            >
              <span className="btn-icon">🎯</span>
              Single Player
            </button>

            {/* Multiplayer */}
            <button
              className="btn btn-secondary"
              onClick={() => setShowMultiOptions(true)}
            >
              <span className="btn-icon">🌐</span>
              Multiplayer
            </button>
          </div>
        ) : (
          /* ── Multiplayer Sub-options ── */
          <div className="btn-group">
            <p className="subtitle" style={{ marginBottom: "0.5rem", opacity: 0.8 }}>
              🌐 Multiplayer
            </p>

            <button
              className="btn btn-primary"
              onClick={() => connectAndGo("/create")}
            >
              <span className="btn-icon">🎮</span>
              Create Room
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => connectAndGo("/join")}
            >
              <span className="btn-icon">🚪</span>
              Join Room
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => setShowMultiOptions(false)}
              style={{ marginTop: "0.25rem" }}
            >
              ← Back
            </button>
          </div>
        )}
        {/* Sign out */}
        <button
          className="btn btn-ghost"
          onClick={clearProfile}
          style={{ marginTop: "1rem", fontSize: "0.8rem", opacity: 0.6 }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}

