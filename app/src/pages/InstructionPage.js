import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function InstructionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { instructionScreenData, questionScreenData, username } = location.state || {};
  console.log("INSTRUCTION SCREEN")
  console.log(instructionScreenData)
  console.log(questionScreenData)

  // If someone lands here without state, send them home
  useEffect(() => {
    if (!instructionScreenData && !questionScreenData) {
      navigate("/");
    }
  }, [instructionScreenData, questionScreenData, navigate]);

  if (!instructionScreenData && !questionScreenData) {
    return null;
  }

  const handleStartPlaying = () => {
    navigate("/game", {
      state: { currentQuestion: questionScreenData.question, username, mode: "single-player" }
    });
  };

  return (
    <div className="page">
      <div className="card glass instruction-card">
        <div className="instruction-icon">📖</div>
        <h1 className="title">How to Play</h1>
        <p className="subtitle" style={{ marginBottom: "12px" }}>
          Single Player Mode
        </p>

        <div className="instruction-content">
          {typeof instructionScreenData.instructionText === "string" ? (
            instructionScreenData.instructionText.split("\n").map((line, i) => (
              <p key={i} className="instruction-line">
                {line}
              </p>
            ))
          ) : Array.isArray(instructionScreenData.instructionText) ? (
            instructionScreenData.instructionText.map((item, i) => (
              <div key={i} className="instruction-step">
                <span className="instruction-step-number">{i + 1}</span>
                <span className="instruction-step-text">{item}</span>
              </div>
            ))
          ) : (
            <p className="instruction-line">
              Answer trivia questions within the time limit to earn points. Good luck!
            </p>
          )}
        </div>

        <button
          className="btn btn-start"
          onClick={handleStartPlaying}
          style={{ width: "100%", marginTop: "24px" }}
        >
          <span className="btn-icon">🚀</span>
          Start Playing
        </button>

        <button
          className="btn btn-ghost"
          onClick={() => navigate("/")}
          style={{ width: "100%", marginTop: "8px" }}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
