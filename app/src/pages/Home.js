import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socketConnection";

export default function Home() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const connectAndGo = (path) => {
    if (!username.trim()) return;
    if (!socket.connected) {
      socket.connect();
    }
    sessionStorage.setItem('myUsername', username.trim());  // store per-tab for (you) identification
    navigate(path, { state: { username: username.trim() } });
  };

  return (
    <div className="page">
      <div className="card glass">
        <div className="logo-icon">🧠</div>
        <h1 className="title">Multi Trivia</h1>
        <p className="subtitle">Challenge your friends in real-time trivia battles</p>

        <input
          className="input"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
        />

        <div className="btn-group">
          <button
            className="btn btn-primary"
            disabled={!username.trim()}
            onClick={() => connectAndGo("/create")}
          >
            <span className="btn-icon">🎮</span>
            Create Room
          </button>
          <button
            className="btn btn-secondary"
            disabled={!username.trim()}
            onClick={() => connectAndGo("/join")}
          >
            <span className="btn-icon">🚪</span>
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
