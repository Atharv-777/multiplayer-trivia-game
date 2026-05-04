import React from "react";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function GameEndScreen({ leaderboard = [], username }) {
    // sessionStorage is per-tab — set at login, never confused across players
    const myUsername = sessionStorage.getItem('myUsername') || username;
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
                {leaderboard.length > 0 && (
                    <div className="game-end-winner-callout">
                        🎉 <strong>{leaderboard[0].username}</strong> wins!
                    </div>
                )}
            </div>
        </div>
    );
}
