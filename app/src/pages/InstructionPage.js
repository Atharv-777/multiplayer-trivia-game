import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function InstructionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { instructionScreenData, questionScreenData, username, totalQuestionsPerRound } = location.state || {};

  useEffect(() => {
    if (!instructionScreenData && !questionScreenData) {
      navigate("/");
    }
  }, [instructionScreenData, questionScreenData, navigate]);

  if (!instructionScreenData && !questionScreenData) return null;

  const handleStartPlaying = () => {
    navigate("/game", {
      state: {
        currentQuestion: questionScreenData.question,
        username,
        mode: "single-player",
        totalQuestionsPerRound
      }
    });
  };

  const instructionText = instructionScreenData?.instructionText;

  return (
    <div className="page">
      <div className="screen-container">
        {/* Header */}
        <div className="instruction-header">
          <span className="instruction-emoji">📖</span>
          <h1 className="instruction-title">How to Play</h1>
          <p className="instruction-subtitle">Single Player Mode</p>
        </div>

        <div className="instruction-body">
          <div className="instruction-card">
            {typeof instructionText === "string" ? (
              instructionText.split("\n").map((line, i) => (
                <p key={i} className="instruction-line">{line}</p>
              ))
            ) : Array.isArray(instructionText) ? (
              instructionText.map((item, i) => (
                <div key={i} className="instruction-step">
                  <span className="instruction-step-number">{i + 1}</span>
                  <span className="instruction-step-text">{item}</span>
                </div>
              ))
            ) : (
              <>
                <div className="instruction-step">
                  <span className="instruction-step-number">1</span>
                  <span className="instruction-step-text">Answer trivia questions within the time limit to earn points.</span>
                </div>
                <div className="instruction-step">
                  <span className="instruction-step-number">2</span>
                  <span className="instruction-step-text">Each correct answer earns you points. Faster answers score more!</span>
                </div>
                <div className="instruction-step">
                  <span className="instruction-step-number">3</span>
                  <span className="instruction-step-text">Complete all questions to finish the round and see your results.</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="instruction-buttons">
          <button className="btn-primary" onClick={handleStartPlaying} id="btn-start-playing">
            <span className="btn-icon">🚀</span>
            Start Playing
          </button>
          <button className="btn-secondary-outline" onClick={() => navigate("/")} id="btn-instruction-back">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
