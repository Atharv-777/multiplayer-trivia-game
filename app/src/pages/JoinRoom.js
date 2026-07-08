import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../socketConnection";
import { getPlayerSigned } from "../services/jestService";

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

    const onConnectError = () => {
      setError("Could not connect to server. Check your connection.");
      setJoining(false);
    };

    socket.on("room:joined", onRoomJoined);
    socket.on("error", onError);
    socket.on("connect_error", onConnectError);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("room:joined", onRoomJoined);
      socket.off("error", onError);
      socket.off("connect_error", onConnectError);
    };
  }, [username, navigate]);

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    setError(null);
    setJoining(true);

    const doJoin = async () => {
      const signedData = await getPlayerSigned();
      socket.emit("room:join", { username, roomCode: roomCode.trim().toUpperCase(), playerSigned: signedData.playerSigned, playerData: signedData.player });
    };

    if (socket.connected) {
      doJoin();
    } else {
      // Socket is still connecting (e.g. first LAN load) — wait for it
      socket.once("connect", doJoin);
    }
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
