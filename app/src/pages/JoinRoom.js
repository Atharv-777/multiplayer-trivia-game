import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../socketConnection";

export default function JoinRoom() {
  console.log("JoinRoom invoked")
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;

  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const onRoomJoined = (data) => {

      navigate("/waiting", {
        state: {
          username,
          roomCode: data.roomCode,
          players: data.players,
        },
      });
    };

    const onError = (data) => {
      setError(data.message);
      setJoining(false);
    };

    socket.on("room:joined", onRoomJoined);
    socket.on("error", onError);

    return () => {
      socket.off("room:joined", onRoomJoined);
      socket.off("error", onError);
    };
  }, [username, navigate]);

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    setError(null);
    setJoining(true);
    socket.emit("room:join", { username, roomCode: roomCode.trim().toUpperCase() });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && roomCode.trim()) {
      handleJoin();
    }
  };

  if (!username) return null;

  return (
    <div className="page">
      <div className="card glass">
        <h1 className="title">Join Room</h1>
        <p className="subtitle">Enter the room code to join a game</p>

        {error && <p className="error-msg">{error}</p>}

        <input
          className="input room-code-input"
          type="text"
          placeholder="Enter room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          maxLength={6}
          autoFocus
        />

        <button
          className="btn btn-primary"
          disabled={!roomCode.trim() || joining}
          onClick={handleJoin}
        >
          {joining ? (
            <>
              <span className="btn-loader"></span> Joining…
            </>
          ) : (
            <>🚪 Join Game</>
          )}
        </button>

        <button className="btn btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
      </div>
    </div>
  );
}
