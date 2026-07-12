import React from "react";
import "./SplashScreen.css";

export default function SplashScreen() {
  return (
    <div className="splash">
      {/* Soft background particles */}
      <div className="splash-particle splash-particle-1" />
      <div className="splash-particle splash-particle-2" />

      <div className="splash-content">
        {/* Floating emoji illustration */}
        <div className="splash-illustration">
          <span className="splash-globe">🌍</span>
          <span className="splash-hat">🎓</span>
          <span className="splash-coin">🪙</span>
          <span className="splash-books">📚</span>
          <span className="splash-star">⭐</span>
        </div>

        {/* Branding */}
        <p className="splash-welcome">Welcome to</p>
        <span className="splash-title">Multi Trivia!</span>
        <p className="splash-tagline">Play, Learn, and Explore with Exciting Quizzes!</p>

        {/* Loading indicator */}
        <div className="splash-loader">
          <span className="splash-dot" />
          <span className="splash-dot" />
          <span className="splash-dot" />
        </div>
      </div>
    </div>
  );
}
