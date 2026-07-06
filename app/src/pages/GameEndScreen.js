import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayerData, setPlayerData, flushPlayerData } from "../services/jestService";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function GameEndScreen({ leaderboard = [], username, mode, score, correctCount, totalQuestions }) {
    const navigate = useNavigate();
    const isSinglePlayer = mode === "single-player";
    // sessionStorage is per-tab — set at login, never confused across players
    const myUsername = sessionStorage.getItem('myUsername') || username;

    // Persist this game's result to the Jest data store once, on mount
    useEffect(() => {
        if (isSinglePlayer) {
            // SP: persist score from props
            const gamesPlayed = (getPlayerData("gamesPlayed") || 0) + 1;
            setPlayerData({ lastScore: score, gamesPlayed });
            flushPlayerData().catch(() => { });
            console.log(`[GameEndScreen] SP — Persisted to Jest — lastScore: ${score}, gamesPlayed: ${gamesPlayed}`);
        } else {
            // MP: persist from leaderboard
            const myEntry = leaderboard.find((p) => p.username === myUsername);
            if (!myEntry) return;

            const lastScore = myEntry.score;
            const gamesPlayed = (getPlayerData("gamesPlayed") || 0) + 1;

            setPlayerData({ lastScore, gamesPlayed });
            flushPlayerData().catch(() => { });

            console.log(`[GameEndScreen] MP — Persisted to Jest — lastScore: ${lastScore}, gamesPlayed: ${gamesPlayed}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ───────── Single-Player Results ─────────
    if (isSinglePlayer) {
        const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

        return (
            <div className="page">
                <div className="card glass game-card">
                    {/* Trophy header */}
                    <div className="game-end-header">
                        <span className="game-end-trophy">🏆</span>
                        <h1 className="game-end-title">Round Complete!</h1>
                        <p className="game-end-subtitle">Here's how you did</p>
                    </div>

                    {/* Score summary */}
                    <div className="round-scoreboard">
                        <div className="answer-summary-row">
                            <span className="answer-summary-label">Score</span>
                            <span className="answer-summary-value text-correct">
                                {score} pts
                            </span>
                        </div>
                        <div className="answer-summary-row">
                            <span className="answer-summary-label">Correct</span>
                            <span className="answer-summary-value">
                                {correctCount} / {totalQuestions}
                            </span>
                        </div>
                        <div className="answer-summary-row">
                            <span className="answer-summary-label">Accuracy</span>
                            <span className={`answer-summary-value ${accuracy >= 70 ? 'text-correct' : accuracy >= 40 ? '' : 'text-incorrect'}`}>
                                {accuracy}%
                            </span>
                        </div>
                    </div>

                    {/* Encouragement */}
                    <div className="game-end-winner-callout">
                        {accuracy >= 80
                            ? "🌟 Outstanding performance!"
                            : accuracy >= 50
                                ? "👏 Good job! Keep practicing!"
                                : "💪 Keep going! You'll do better next time!"}
                    </div>

                    {/* Play Again */}
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate("/")}
                        style={{ width: "100%", marginTop: "16px" }}
                    >
                        <span className="btn-icon">🏠</span>
                        Play Again
                    </button>
                </div>
            </div>
        );
    }

    // ───────── Multiplayer Leaderboard ─────────
    return (
        <div className="page">
            <div className="card glass game-card">
                {/* Trophy header */}
                <div className="game-end-header">
                    <span className="game-end-trophy">🏆</span>
                    <h1 className="game-end-title">Game Over!</h1>
                    <p className="game-end-subtitle">Final Leaderboard</p>
                </div>

                {/* Leaderboard list */}
                <div className="leaderboard">
                    {leaderboard.map((player, index) => {
                        const isYou = player.username === myUsername;
                        const medal = MEDAL[index] ?? null;

                        return (
                            <div
                                key={player.socketId || index}
                                className={`leaderboard-row${index === 0 ? " leaderboard-row-winner" : ""}${isYou ? " leaderboard-row-you" : ""}`}
                            >
                                {/* Rank */}
                                <span className="leaderboard-rank">
                                    {medal ?? `#${index + 1}`}
                                </span>

                                {/* Name */}
                                <span className="leaderboard-name">
                                    {player.username}
                                    {isYou && <span className="leaderboard-you-tag"> (you)</span>}
                                </span>

                                {/* Score */}
                                <span className="leaderboard-score">
                                    {player.score} pts
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Winner callout */}
                {
                    leaderboard.length > 0 && (
                        <div className="game-end-winner-callout">
                            🎉 <strong>{
                                leaderboard[0].username
                            }</strong> wins!
                        </div>
                    )}

                {/* Home button */}
                <button
                    className="btn btn-primary"
                    onClick={() => navigate("/")}
                    style={{ width: "100%", marginTop: "16px" }}
                >
                    <span className="btn-icon">🏠</span>
                    Home
                </button>
            </div>
        </div>
    );
}
