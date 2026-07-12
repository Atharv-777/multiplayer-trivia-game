import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayerData, setPlayerData, flushPlayerData } from "../services/jestService";

const MEDAL = ["🥇", "🥈", "🥉"];
const AVATAR_COLORS = ["#7B2FBF", "#26890C", "#FFA500", "#E21B3C", "#1565C0"];

export default function GameEndScreen({ leaderboard = [], username, mode, score, correctCount, totalQuestions }) {
    const navigate = useNavigate();
    const isSinglePlayer = mode === "single-player";
    const myUsername = sessionStorage.getItem("myUsername") || username;

    // Persist result to Jest data store on mount
    useEffect(() => {
        if (isSinglePlayer) {
            const gamesPlayed = (getPlayerData("gamesPlayed") || 0) + 1;
            setPlayerData({ lastScore: score, gamesPlayed });
            flushPlayerData().catch(() => {});
        } else {
            const myEntry = leaderboard.find((p) => p.username === myUsername);
            if (!myEntry) return;
            const gamesPlayed = (getPlayerData("gamesPlayed") || 0) + 1;
            setPlayerData({ lastScore: myEntry.score, gamesPlayed });
            flushPlayerData().catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Single-Player Results (Screen 9) ──
    if (isSinglePlayer) {
        const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        const progressPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

        const motivational =
            accuracy >= 80
                ? "🌟 Outstanding performance!"
                : accuracy >= 50
                    ? "👏 Good job! Keep practicing!"
                    : "💪 Keep going! You'll do better next time!";

        const accuracyClass =
            accuracy >= 70 ? "detail-value-green" : accuracy >= 40 ? "" : "detail-value-red";

        return (
            <div className="page">
                <div className="screen-container">
                    {/* Header */}
                    <div className="screen-header">
                        <div style={{ width: 36 }} />
                        <span className="screen-title">Round End</span>
                        <div style={{ width: 36 }} />
                    </div>

                    <div className="results-content">
                        {/* Trophy badge */}
                        <span className="results-badge-emoji">🎯</span>
                        <h2 className="results-title">Round Complete!</h2>

                        {/* Stats card */}
                        <div className="results-stats-card">
                            <div className="results-score-value">{score} pts</div>
                            <div className="results-score-label">Your Final Score</div>

                            <div className="results-details">
                                <div className="detail-row">
                                    <span>Questions Answered</span>
                                    <span>{totalQuestions} / {totalQuestions}</span>
                                </div>
                                <div className="detail-row">
                                    <span>Correct Answers</span>
                                    <span>{correctCount}</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="detail-row" style={{ marginTop: 4 }}>
                                    <span>Accuracy</span>
                                    <span className={accuracyClass}>{accuracy}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Motivational */}
                        <p className="results-motivational">{motivational}</p>

                        {/* Buttons */}
                        <div className="results-buttons">
                            <button className="btn-primary" onClick={() => navigate("/")} id="btn-play-again">
                                <span className="btn-icon">🔄</span> Play Again
                            </button>
                            <button className="btn-secondary-outline" onClick={() => navigate("/")} id="btn-go-home">
                                Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Multiplayer Final Leaderboard ──
    return (
        <div className="page">
            <div className="screen-container">
                {/* Header */}
                <div className="mp-end-header">
                    <span className="mp-end-trophy">🏆</span>
                    <h1 className="mp-end-title">Game Over!</h1>
                    <p className="mp-end-subtitle">Final Leaderboard</p>
                </div>

                {/* Leaderboard */}
                <div className="mp-leaderboard-card">
                    {leaderboard.map((player, index) => {
                        const isYou = player.username === myUsername;
                        return (
                            <div
                                key={player.socketId || index}
                                className={`leaderboard-row${isYou ? " you" : ""}`}
                                style={{ animationDelay: `${index * 0.06}s` }}
                            >
                                <span className="leaderboard-rank">
                                    {MEDAL[index] ?? `#${index + 1}`}
                                </span>
                                <div
                                    className="player-avatar"
                                    style={{
                                        background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                                        width: 28,
                                        height: 28,
                                        fontSize: "0.75rem",
                                        flexShrink: 0
                                    }}
                                >
                                    {player.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="leaderboard-name">
                                    {player.username}
                                    {isYou && <span className="leaderboard-you-tag"> (you)</span>}
                                </span>
                                <span className="leaderboard-score">{player.score} pts</span>
                            </div>
                        );
                    })}
                </div>

                {/* Winner callout */}
                {leaderboard.length > 0 && (
                    <div className="winner-callout">
                        🎉 <strong>{leaderboard[0].username}</strong> wins!
                    </div>
                )}

                {/* Home button */}
                <div className="mp-end-buttons">
                    <button className="btn-primary" onClick={() => navigate("/")} id="btn-mp-home">
                        <span className="btn-icon">🏠</span> Home
                    </button>
                </div>
            </div>
        </div>
    );
}
