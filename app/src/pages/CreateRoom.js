import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import socket from "../socketConnection";
import { getPlayerSigned } from "../services/jestService";

export default function CreateRoom() {
  console.log("CreateRoom invoked")
  const location = useLocation();
  const navigate = useNavigate();
  const { savedProfile } = useJest();
  // location.state is primary (set by Home); JestContext is the fallback
  const username = location.state?.username || savedProfile?.username || "";

  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  const hasSentCreate = useRef(false);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    const onRoomCreated = (data) => {
      console.log(`ROOM CREATE : ${data.roomCode}`)
      setRoomCode(data.roomCode);
      setPlayers([username]);
    };

    const onPlayerJoined = (data) => {
      setPlayers(data.players);
    };

    const onError = (data) => {
      setError(data.message);
    };

    const onGameStarted = (data) => {
      console.log("STARTING THE GAME")
      navigate("/game", { state: { username: username, roomCode: data.roomCode, currentQuestion: data.currentQuestion } });
    };

    const onConnectError = () => {
      setError("Could not connect to server. Check your connection.");
    };

    const doCreate = async () => {
      if (hasSentCreate.current) return;
      hasSentCreate.current = true;
      const signedData = await getPlayerSigned();
      socket.emit("room:create", { username, playerSigned: signedData.playerSigned, playerData: signedData.player });
    };

    socket.on("room:created", onRoomCreated);
    socket.on("room:player_joined", onPlayerJoined);
    socket.on("game:started", (data) => onGameStarted(data));
    socket.on("error", onError);
    socket.on("connect_error", onConnectError);

    if (socket.connected) {
      doCreate();
    } else {
      socket.once("connect", doCreate);
      socket.connect();
    }

    return () => {
      socket.off("room:created", onRoomCreated);
      socket.off("room:player_joined", onPlayerJoined);
      socket.off("game:started", onGameStarted);
      socket.off("error", onError);
      socket.off("connect_error", onConnectError);
    };
  }, [username, navigate]);


  const handleStartGame = async () => {
    console.log(`USERNAME : ${username} || ROOM CODE : ${roomCode}`)
    const signedData = await getPlayerSigned();
    socket.emit("game:start", { username, roomCode, playerSigned: signedData.playerSigned, playerData: signedData.player });
  };

  if (!username) return null;

  return (
    <div className="page">
      <div className="card glass">
        <h1 className="title">Waiting Room</h1>

        {error && <p className="error-msg">{error}</p>}

        {roomCode ? (
          <>
            <p className="subtitle">Share this code with your friends</p>
            <div className="room-code-display">{roomCode}</div>

            <div className="players-section">
              <h3 className="players-title">
                Players joined : {players.length}
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

            <button
              className="btn btn-start"
              onClick={handleStartGame}
              disabled={players.length < 2}
            >
              🚀 Start Game
            </button>
            {players.length < 2 && (
              <p className="hint-text">Need at least 2 players to start</p>
            )}
          </>
        ) : (
          <div className="loader-container">
            <div className="loader"></div>
            <p className="subtitle">Creating room…</p>
          </div>
        )}
      </div>
    </div>
  );
}
