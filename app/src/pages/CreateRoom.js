import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import socket from "../socketConnection";
import { getPlayerSigned } from "../services/jestService";

export default function CreateRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const { savedProfile } = useJest();
  const username = location.state?.username || savedProfile?.username || "";

  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const hasSentCreate = useRef(false);

  useEffect(() => {
    if (!username) { navigate("/"); return; }

    const onRoomCreated = (data) => {
      setRoomCode(data.roomCode);
      setPlayers([username]);
    };

    const onPlayerJoined = (data) => { setPlayers(data.players); };
    const onError = (data) => { setError(data.message); };

    const onGameStarted = (data) => {
      navigate("/game", {
        state: { username, roomCode: data.roomCode, currentQuestion: data.currentQuestion }
      });
    };

    const onConnectError = () => {
      setError("Could not connect to server. Check your connection.");
    };

    const doCreate = async () => {
      if (hasSentCreate.current) return;
      hasSentCreate.current = true;
      const signedData = await getPlayerSigned();
      socket.emit("room:create", {
        username,
        playerSigned: signedData.playerSigned,
        playerData: signedData.player
      });
    };

    socket.on("room:created", onRoomCreated);
    socket.on("room:player_joined", onPlayerJoined);
    socket.on("game:started", (data) => onGameStarted(data));
    socket.on("error", onError);
    socket.on("connect_error", onConnectError);

    if (socket.connected) { doCreate(); }
    else { socket.once("connect", doCreate); socket.connect(); }

    return () => {
      socket.off("room:created", onRoomCreated);
      socket.off("room:player_joined", onPlayerJoined);
      socket.off("game:started", onGameStarted);
      socket.off("error", onError);
      socket.off("connect_error", onConnectError);
    };
  }, [username, navigate]);

  const handleStartGame = async () => {
    const signedData = await getPlayerSigned();
    socket.emit("game:start", {
      username,
      roomCode,
      playerSigned: signedData.playerSigned,
      playerData: signedData.player
    });
  };

  const handleCopy = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!username) return null;

  // ── Creating room (no code yet) ──
  if (!roomCode) {
    return (
      <div className="page">
        <div className="screen-container">
          <div className="screen-header">
            <button className="btn-back" onClick={() => navigate("/")}>←</button>
            <span className="screen-title">Waiting Room</span>
            <div style={{ width: 36 }} />
          </div>

          {error && <p className="error-msg" style={{ margin: "0 20px" }}>{error}</p>}

          <div className="loader-container">
            <div className="loader" />
            <p className="loader-text">Creating room…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Room created — show Waiting Lobby (Screen 4) ──
  return (
    <div className="page">
      <div className="screen-container">
        <div className="screen-header">
          <button className="btn-back" onClick={() => navigate("/")}>←</button>
          <span className="screen-title">Waiting Room</span>
          <div style={{ width: 36 }} />
        </div>

        {error && <p className="error-msg" style={{ margin: "0 20px 0" }}>{error}</p>}

        <div className="waiting-lobby">
          {/* Room Code Card */}
          <div className="code-display-card">
            <span className="code-label">Lobby Join Code</span>
            <div className="room-code-display">
              {roomCode}
              <span
                className="copy-btn"
                onClick={handleCopy}
                title="Copy code"
                id="btn-copy-room-code"
              >
                {copied ? "✓" : "📋"}
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

            <div style={{ flex: 1 }} />

            <button
              className="btn-primary"
              onClick={handleStartGame}
              disabled={players.length < 2}
              id="btn-start-game"
            >
              Start Game
            </button>
            {players.length < 2 && (
              <p className="hint-text">Need at least 2 players to start</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const AVATAR_COLORS = ["#7B2FBF", "#26890C", "#FFA500", "#E21B3C", "#1565C0"];
