import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../socketConnection";

export default function WaitingRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, roomCode, players: initialPlayers } = location.state || {};

  const [players, setPlayers] = useState(initialPlayers || []);

  useEffect(() => {
    if (!username || !roomCode) {
      navigate("/");
      return;
    }

    const onPlayerJoined = (data) => {
      setPlayers(data.players);
    };

    const onGameStarted = (data) => {
      console.log("REDIRECTING TO GAME")
      navigate("/game", { state: { username: username, roomCode: data.roomCode, currentQuestion: data.currentQuestion } });
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
      <div className="card glass">
        <h1 className="title">Waiting Room</h1>
        <p className="subtitle">Waiting for the host to start the game…</p>

        <div className="room-code-display">{roomCode}</div>

        <div className="players-section">
          <h3 className="players-title">
            Players ({players.length}/4)
          </h3>
          <ul className="player-list">
            {players.map((p, i) => (
              <li key={i} className="player-item">
                <span className="player-avatar">
                  {p.charAt(0).toUpperCase()}
                </span>
                <span className="player-name">{p}</span>
                {i === 0 && <span className="host-badge">HOST</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="waiting-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
}
