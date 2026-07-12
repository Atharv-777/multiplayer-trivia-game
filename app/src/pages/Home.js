import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import socket from "../socketConnection";
import { buySubscription, getPlayerSigned, getPlayerData } from "../services/jestService";
import API from "../services/apiEndpoints";
import axios from "axios";
let startGameData = require("../dummyData/startGame.json")

export default function Home() {
  const navigate = useNavigate();
  const { savedProfile, subscriptions, setSubscriptions } = useJest();
  const username = savedProfile?.username || "Player";
  const activeSubscriptionSku = "MULTI_TRIVIA_PLUS";
  const premiumPlan = subscriptions?.find(sub => sub.sku === activeSubscriptionSku);
  const isPremiumSubscriber = premiumPlan?.status === "active";
  // const lastScore = 10;

  // Multiplayer sub-view: null | "options" | "join-expanded"
  const [mpView, setMpView] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState(null);
  const [joining, setJoining] = useState(false);

  // Pull stats from Jest data store (best-effort)
  const gamesPlayed = getPlayerData("gamesPlayed") || 0;
  const lastScore = getPlayerData("lastScore") || 10;

  const connectAndGo = (path) => {
    if (!socket.connected) socket.connect();
    navigate(path, { state: { username } });
  };

  const handleBuySubscription = async () => {
    try {
      const result = await buySubscription(activeSubscriptionSku);
      if (result.result === "success") {
        const signedData = await getPlayerSigned();
        const subscriptionDetails = result.subscription.status === "active" ? [result.subscription] : [];
        setSubscriptions(subscriptionDetails);
        await axios.post(API.USER.UPDATE_SUBSCRIPTION, {
          subscriptionDetails: result.subscription,
          playerData: signedData.player
        }, { headers: { Authorization: signedData.playerSigned } });
      }
    } catch (e) {
      console.error("Failed to buy subscription", e);
    }
  };

  const handlerSinglePlayer = async () => {
    try {
      const signedData = await getPlayerSigned();
      let response = await axios.post(API.GAME.START_GAME, {
        playerData: signedData.player
      }, { headers: { Authorization: signedData.playerSigned } });
      // let response = startGameData
      console.log("START GAME RESPONSE : " + JSON.stringify(response))
      const { toShowInstructionScreen, instructionScreenData, questionScreenData } = response.data.data;
      const totalQuestionsPerRound = response.data.data.totalQuestionsPerRound;

      if (toShowInstructionScreen) {
        navigate("/instructions", {
          state: { instructionScreenData, questionScreenData, username, totalQuestionsPerRound }
        });
      } else {
        navigate("/game", {
          state: { currentQuestion: questionScreenData.question, username, mode: "single-player", totalQuestionsPerRound }
        });
      }
    } catch (err) {
      console.error("Error starting single-player game:", err);
    }
  };

  const handleJoinSubmit = () => {
    if (!joinCode.trim()) return;
    setJoinError(null);
    setJoining(true);

    if (!socket.connected) socket.connect();

    const doJoin = async () => {
      const signedData = await getPlayerSigned();
      socket.emit("room:join", {
        username,
        roomCode: joinCode.trim().toUpperCase(),
        playerSigned: signedData.playerSigned,
        playerData: signedData.player
      });
    };

    const onRoomJoined = (data) => {
      socket.off("room:joined", onRoomJoined);
      socket.off("error", onJoinError);
      navigate("/waiting", { state: { username, roomCode: data.roomCode, players: data.players } });
    };

    const onJoinError = (data) => {
      socket.off("room:joined", onRoomJoined);
      socket.off("error", onJoinError);
      setJoinError(data.message);
      setJoining(false);
    };

    socket.on("room:joined", onRoomJoined);
    socket.on("error", onJoinError);

    if (socket.connected) {
      doJoin();
    } else {
      socket.once("connect", doJoin);
    }
  };

  // ── Mode Selection (default view) ──
  if (!mpView) {
    return (
      <div className="page">
        <div className="screen-container">
          {/* Header */}
          <div className="home-header">
            <div className="user-greeting">Hello, {username}! 👋</div>
            {/* {lastScore > 0 && (
              <div className="score-badge">🏆 {lastScore}</div>
            )} */}
          </div>

          <h2 className="home-title">What would you<br />like to do?</h2>

          {/* Mode Cards */}
          <div className="home-mode-grid">
            <div className="mode-card" onClick={handlerSinglePlayer} id="btn-single-player">
              <div className="mode-icon">🧠</div>
              <div>
                <div className="mode-name">Single Player</div>
                <div className="mode-sub">7 Questions</div>
              </div>
            </div>

            <div className="mode-card" onClick={() => setMpView("options")} id="btn-multiplayer">
              <div className="mode-icon">🎮</div>
              <div>
                <div className="mode-name">Multiplayer</div>
                <div className="mode-sub">Play with Friends</div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="stats-section">
            <div className="section-title">Your Statistics</div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{gamesPlayed}</div>
                <div className="stat-label">Games Played</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{lastScore > 0 ? `${lastScore}` : "—"}</div>
                <div className="stat-label">Last Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{isPremiumSubscriber ? "✓" : "—"}</div>
                <div className="stat-label">Premium</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">🔥</div>
                <div className="stat-label">Daily Mode</div>
              </div>
            </div>
          </div>

          {/* Premium button */}
          {!isPremiumSubscriber && (
            <div className="home-premium-section">
              <button className="btn-premium" onClick={handleBuySubscription} id="btn-buy-premium">
                <span>💎</span> Buy Premium Plan
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Multiplayer Options View ──
  return (
    <div className="page">
      <div className="screen-container">
        {/* Header */}
        <div className="screen-header">
          <button className="btn-back" onClick={() => { setMpView(null); setJoinCode(""); setJoinError(null); }}>←</button>
          <span className="screen-title">Multiplayer</span>
          <div style={{ width: 36 }} />
        </div>

        <div className="mp-options-section">
          {/* Create Room Card */}
          <div className="mp-card" id="card-create-room">
            <div className="mp-card-header">
              <div className="mp-card-icon create">➕</div>
              <div className="mp-card-title">Create Room</div>
            </div>
            <p className="mp-card-desc">Start a new game lobby, choose topics (Premium), and invite friends to compete.</p>
            <button className="btn-primary" onClick={() => connectAndGo("/create")} id="btn-create-room">
              Create Room
            </button>
          </div>

          {/* Join Room Card */}
          <div className="mp-card" id="card-join-room">
            <div className="mp-card-header">
              <div className="mp-card-icon join">🚪</div>
              <div className="mp-card-title">Join Room</div>
            </div>
            <p className="mp-card-desc">Enter an active 6-digit room code shared by your friend to join their lobby.</p>

            {mpView !== "join-expanded" ? (
              <button
                className="btn-primary btn-green"
                onClick={() => setMpView("join-expanded")}
                id="btn-show-join-input"
              >
                Join Room
              </button>
            ) : (
              <div className="join-expandable" id="join-code-section">
                {joinError && <p className="error-msg">{joinError}</p>}
                <input
                  type="text"
                  className="input-code"
                  placeholder="ENTER CODE"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinSubmit()}
                  autoFocus
                  id="join-code-input"
                />
                <button
                  className="btn-primary btn-green"
                  style={{ width: "100%" }}
                  onClick={handleJoinSubmit}
                  disabled={!joinCode.trim() || joining}
                  id="btn-join-lobby"
                >
                  {joining ? "Joining…" : "Join Lobby"}
                </button>
              </div>
            )}
          </div>
        </div>

        {!isPremiumSubscriber && (
          <p className="mp-limit-text">
            Free tier: 3 lifetime rooms total. <strong onClick={handleBuySubscription}>Go Premium</strong> for unlimited access.
          </p>
        )}
      </div>
    </div>
  );
}
