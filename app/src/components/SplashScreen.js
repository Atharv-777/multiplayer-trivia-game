import React from "react";
import "./SplashScreen.css";

export default function SplashScreen() {
  return (
    <div className="splash">
      {/* Background orbs */}
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />
      <div className="splash-orb splash-orb-3" />

      <div className="splash-content">
        <div className="splash-logo">🧠</div>
        <h1 className="splash-title">Multi Trivia</h1>
        <p className="splash-tagline">Preparing your arena…</p>

        {/* Loading dots */}
        <div className="splash-loader">
          <span className="splash-dot" />
          <span className="splash-dot" />
          <span className="splash-dot" />
        </div>
      </div>
    </div>
  );
}
