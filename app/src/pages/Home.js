import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import socket from "../socketConnection";
import { buySubscription, checkSubscription, getPlayerSigned } from "../services/jestService";
import API from "../services/apiEndpoints";
import axios from "axios";

export default function Home() {
  const navigate = useNavigate();
  const { savedProfile, subscriptions, setSubscriptions } = useJest();
  console.log("SAVE PROFILE : " + JSON.stringify(savedProfile))
  const username = savedProfile?.username || "";
  console.log("USERNAME @Home.js: " + username)
  const activeSubscriptionSku = "MULTI_TRIVIA_PLUS";
  const premiumPlan = subscriptions?.find(sub => sub.sku === activeSubscriptionSku);
  const isPremiumSubscriber = premiumPlan?.status === "active";

  const [showMultiOptions, setShowMultiOptions] = useState(false);

  const connectAndGo = (path) => {
    if (!username) return;
    if (!socket.connected) socket.connect();
    navigate(path, { state: { username } });
  };

  const handleBuySubscription = async () => {
    try {
      // Use your specific SKU here
      const result = await buySubscription(activeSubscriptionSku);
      console.log("SUBSCRIPTION RESULT : " + JSON.stringify(result))

      if (result.result === "success") {
        console.log("Subscription purchased successfully!", result.subscription);
        // Get the signed player token to prove identity to the backend
        const signedData = await getPlayerSigned();
        let subscriptionDetails = result.subscription.status == "active" ? [result.subscription] : []
        setSubscriptions(subscriptionDetails)

        // Call backend API to update subscription in DB
        await axios.post(API.USER.UPDATE_SUBSCRIPTION, {
          subscriptionDetails: result.subscription,
          playerData: signedData.player
        }, {
          headers: { Authorization: signedData.playerSigned }
        });

        // alert("Subscription successfully purchased and synced to backend!");
      } else if (result.result === "cancel") {
        console.log("Subscription cancelled by user");
      } else {
        console.error("Subscription error", result.error);
        // alert("Error buying subscription: " + result.error);
      }
    } catch (e) {
      console.error("Failed to buy subscription", e);
      // alert("Failed to initiate subscription");
    }
  };

  const handlerSinglePlayer = async () => {
    try {
      const signedData = await getPlayerSigned()
      let response = await axios.post(API.GAME.START_GAME, {
        playerData: signedData.player
      }, {
        headers: { Authorization: signedData.playerSigned }
      })

      console.log("game/start-game RESPONSE : " + JSON.stringify(response))
      const { toShowInstructionScreen, instructionScreenData, questionScreenData } = response.data.data
      console.log(toShowInstructionScreen)
      console.log(instructionScreenData)
      console.log(questionScreenData)

      // Extract totalQuestionsPerRound from the question data if available
      const totalQuestionsPerRound = response.data.data.totalQuestionsPerRound

      if (toShowInstructionScreen) {
        navigate("/instructions", {
          state: { instructionScreenData, questionScreenData, username, totalQuestionsPerRound }
        })
      } else {
        navigate("/game", {
          state: { currentQuestion: questionScreenData.question, username, mode: "single-player", totalQuestionsPerRound }
        })
      }
    } catch (err) {
      console.error("Error starting single-player game:", err)
      alert(err?.response?.data?.error || "Failed to start game. Please try again.")
    }
  }

  return (
    <div className="page">
      <div className="card glass">
        <div className="logo-icon">🧠</div>
        <h1 className="title">Multi Trivia</h1>
        <p className="subtitle">
          Welcome, <strong>{username}</strong> 👋
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
              onClick={handlerSinglePlayer}
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

            {/* Buy Subscription */}
            {!isPremiumSubscriber && (
              <button
                className="btn btn-ghost"
                onClick={handleBuySubscription}
                style={{ marginTop: "1rem" }}
              >
                <span className="btn-icon">💎</span>
                Buy Premium Plan
              </button>
            )}
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
      </div>
    </div>
  );
}
