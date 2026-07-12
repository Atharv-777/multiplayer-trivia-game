import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import socket from "../socketConnection";

export default function WaitingRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const { savedProfile } = useJest();
  const username = location.state?.username || savedProfile?.username || "";
  const { roomCode, players: initialPlayers } = location.state || {};

  const [players, setPlayers] = useState(initialPlayers || []);

  useEffect(() => {
    if (!username || !roomCode) { navigate("/"); return; }

    const onPlayerJoined = (data) => { setPlayers(data.players); };

    const onGameStarted = (data) => {
      navigate("/game", {
        state: { username, roomCode: data.roomCode, currentQuestion: data.currentQuestion, roundTime: data.roundTime }
      });
    };

    socket.on("room:player_joined", onPlayerJoined);
    socket.on("game:started", (data) => onGameStarted(data));

    return () => {
      socket.off("room:player_joined", onPlayerJoined);
      socket.off("game:started", onGameStarted);
    };
  }, [username, roomCode, navigate]);

  if (!username || !roomCode) return null;

  return (
    <div className="page">
      <div className="screen-container">
        <div className="screen-header">
          <button className="btn-back" onClick={() => navigate("/")}>←</button>
          <span className="screen-title">Waiting Room</span>
          <div style={{ width: 36 }} />
        </div>

        <div className="waiting-lobby">
          {/* Room Code Card */}
          <div className="code-display-card">
            <span className="code-label">Lobby Join Code</span>
            <div className="room-code-display">
              {roomCode}
              <span
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(roomCode).catch(() => { })}
                title="Copy code"
                id="btn-copy-code-waiting"
              >
                📋
              </span>
            </div>
          </div>

          {/* Players List */}
          <div className="players-list-card">
            <span className="players-count-label">Players ({players.length}/5)</span>

            {players.map((p, i) => (
              <div key={i} className="player-row" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="player-profile">
                  <div
                    className="player-avatar"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {p.charAt(0).toUpperCase()}
                  </div>
                  <span className="player-name">{p}</span>
                </div>
                {i === 0 && <span className="badge-host">Host</span>}
              </div>
            ))}

            <div style={{ flex: 1, minHeight: 12 }} />

            {/* Waiting for host */}
            <div className="waiting-for-host">
              <p>Waiting for host to start…</p>
              <div className="waiting-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const AVATAR_COLORS = ["#7B2FBF", "#26890C", "#FFA500", "#E21B3C", "#1565C0"];
