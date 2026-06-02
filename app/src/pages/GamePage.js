import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import socket from "../socketConnection";
import GameEndScreen from "./GameEndScreen";

export default function GamePage() {
    console.log("GamePage invoked")
    const location = useLocation();
    const navigate = useNavigate();
    const { savedProfile } = useJest();
    const { roomCode, currentQuestion, roundTime: initialRoundTime } = location.state || {};
    // location.state is primary; JestContext is the fallback
    const username = location.state?.username || savedProfile?.username || "";
    console.log("CURRENT QUESTION : " + JSON.stringify(currentQuestion))

    const [roundTime, setRoundTime] = useState(initialRoundTime || 15); // seconds — driven by backend
    const NEXT_QUESTION_DELAY = 5; // seconds to show answer screen

    const [question, setQuestion] = useState(currentQuestion);

    // Play voiceover for the very first question (passed via location.state)
    useEffect(() => {
        if (currentQuestion?.audioUrl) playAudio(currentQuestion.audioUrl);
        return () => stopAudio();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [selectedOption, setSelectedOption] = useState(null);
    const [questionNumber, setQuestionNumber] = useState(1);
    const [timeLeft, setTimeLeft] = useState(roundTime);
    const [timerExpired, setTimerExpired] = useState(false);
    const timerRef = useRef(null);
    const audioRef = useRef(null); // holds the current question's Audio instance

    // Helper: stop whatever audio is currently playing
    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
    }, []);

    // Helper: play a Firebase Storage MP3 URL
    const playAudio = useCallback((url) => {
        if (!url) return;
        stopAudio();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch((err) => {
            // Browsers may block autoplay — log silently
            console.warn("Audio playback blocked:", err);
        });
    }, [stopAudio]);

    // Scoreboard screen state
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [isGameComplete, setIsGameComplete] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [nextCountdown, setNextCountdown] = useState(NEXT_QUESTION_DELAY);
    const [pointsEarned, setPointsEarned] = useState(null);
    const nextTimerRef = useRef(null);

    // Clear any running timer
    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const clearNextTimer = useCallback(() => {
        if (nextTimerRef.current) {
            clearInterval(nextTimerRef.current);
            nextTimerRef.current = null;
        }
    }, []);

    // Start/restart the countdown whenever a new question appears
    useEffect(() => {
        if (!question || showScoreboard) return;

        // Reset timer state
        setTimeLeft(roundTime);
        setTimerExpired(false);
        clearTimer();

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    setTimerExpired(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearTimer();
    }, [question, showScoreboard, clearTimer, roundTime]);

    // When timer expires, auto-submit empty answer so server counts us
    useEffect(() => {
        if (timerExpired && !selectedOption) {
            socket.emit("game:submitAnswer", {
                roomCode,
                answer: null, // no answer selected
            });
        }
    }, [timerExpired, selectedOption, roomCode]);

    // Stop timer when player selects an answer
    useEffect(() => {
        if (selectedOption) {
            clearTimer();
        }
    }, [selectedOption, clearTimer]);

    useEffect(() => {
        console.log(`USERNAME : ${username} || ROOM CODE : ${roomCode}`)
        if (!username || !roomCode) {
            console.log("USER NAME || ROOM CODE not found")
            navigate("/");
            return;
        }

        const onQuestion = (data) => {
            // New question arriving — reset everything
            const q = data.currentQuestion || data;
            if (data.roundTime) setRoundTime(data.roundTime);
            setShowScoreboard(false);
            clearNextTimer();
            setQuestion(q);
            setQuestionNumber(q.questionNumber || questionNumber + 1);
            setSelectedOption(null);
            setIsGameComplete(false);
            setLeaderboard([]);
            setNextCountdown(NEXT_QUESTION_DELAY);
            // Play the pre-generated voiceover MP3 from Firebase Storage
            if (q.audioUrl) playAudio(q.audioUrl);
        };

        const onRoundEnd = (data) => {
            // Round is over — show the scoreboard; stop voiceover
            clearTimer();
            stopAudio();
            if (data.roundTime) setRoundTime(data.roundTime);
            setIsGameComplete(data.isGameComplete || false);
            setLeaderboard(data.leaderboard || []);

            // Show points earned this round
            const myPoints = data.pointsThisRound?.[socket.id] ?? null;
            setPointsEarned(myPoints);

            if (data.isGameComplete) {
                // Game finished — GameEndScreen will render
            } else {
                // Still playing — show scoreboard then countdown to next question
                setShowScoreboard(true);
                setNextCountdown(NEXT_QUESTION_DELAY);
                nextTimerRef.current = setInterval(() => {
                    setNextCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(nextTimerRef.current);
                            nextTimerRef.current = null;
                            socket.emit("game:nextQuestion", { roomCode });
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        };

        socket.on("game:question", onQuestion);
        socket.on("game:roundEnd", onRoundEnd);

        return () => {
            socket.off("game:question", onQuestion);
            socket.off("game:roundEnd", onRoundEnd);
            clearNextTimer();
            stopAudio(); // clean up audio on unmount
        };
    }, [username, roomCode, navigate, questionNumber, clearTimer, clearNextTimer, playAudio, stopAudio]);

    const handleOptionClick = (option) => {
        if (selectedOption || timerExpired || showScoreboard) return;
        setSelectedOption(option);
        socket.emit("game:submitAnswer", {
            roomCode,
            answer: option,
        });
    };

    // Derive correctness from question.answer (available client-side)
    const correctAnswer = question?.answer;
    const playerIsCorrect = selectedOption && selectedOption === correctAnswer;

    const getOptionClass = (option) => {
        let cls = "game-option";
        // Still playing — just highlight selected
        if (selectedOption === option) cls += " selected";
        if ((selectedOption || timerExpired) && selectedOption !== option) cls += " disabled";
        return cls;
    };

    const MEDAL = ["🥇", "🥈", "🥉"];

    if (!username || !roomCode) return null;



    // ───────── Game End Screen ─────────
    if (isGameComplete) {
        return <GameEndScreen leaderboard={leaderboard} username={username} />;
    }

    // Waiting for first question from the server
    if (!question) {
        return (
            <div className="page">
                <div className="card glass game-card">
                    <h1 className="title">Get Ready!</h1>
                    <p className="subtitle">Waiting for the first question…</p>
                    <div className="loader-container">
                        <div className="loader"></div>
                    </div>
                </div>
            </div>
        );
    }

    // ───────── Scoreboard Screen ─────────
    if (showScoreboard) {
        return (
            <div className="page">
                <div className="card glass game-card">
                    {/* Header bar */}
                    <div className="game-header">
                        <span className="game-room-code">{roomCode}</span>
                        <span className="game-question-num">Q{questionNumber}</span>
                    </div>

                    {/* Result banner */}
                    <div className={`answer-banner ${playerIsCorrect ? 'answer-banner-correct' : 'answer-banner-incorrect'}`}>
                        <span className="answer-banner-icon">
                            {!selectedOption ? '⏰' : playerIsCorrect ? '🎉' : '❌'}
                        </span>
                        <span className="answer-banner-text">
                            {!selectedOption
                                ? "Time's up!"
                                : playerIsCorrect
                                    ? `Correct!`
                                    : 'Wrong!'}
                        </span>
                    </div>

                    {/* Scoreboard */}
                    <div className="round-scoreboard">
                        <h3 className="round-scoreboard-title">📊 Scoreboard</h3>
                        <div className="leaderboard">
                            {leaderboard.map((player, index) => {
                                const isYou = player.username === username;
                                const medal = MEDAL[index] ?? null;
                                return (
                                    <div
                                        key={player.username}
                                        className={`leaderboard-row${index === 0 ? " leaderboard-row-winner" : ""}${isYou ? " leaderboard-row-you" : ""}`}
                                        style={{ animationDelay: `${index * 0.08}s` }}
                                    >
                                        <span className="leaderboard-rank">
                                            {medal ?? `#${index + 1}`}
                                        </span>
                                        <span className="leaderboard-name">
                                            {player.username}
                                            {isYou && <span className="leaderboard-you-tag"> (you)</span>}
                                        </span>
                                        <span className="leaderboard-score">
                                            {player.score} pts
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        {pointsEarned !== null && (
                            <div className="answer-summary-row">
                                <span className="answer-summary-label">Points earned</span>
                                <span className={`answer-summary-value ${pointsEarned > 0 ? 'text-correct' : 'text-incorrect'}`}>
                                    {pointsEarned > 0 ? `+${pointsEarned} pts` : '+0 pts'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Next question countdown */}
                    <div className="next-question-countdown">
                        <div className="countdown-ring">
                            <svg viewBox="0 0 40 40" className="countdown-svg">
                                <circle
                                    cx="20" cy="20" r="17"
                                    className="countdown-track"
                                />
                                <circle
                                    cx="20" cy="20" r="17"
                                    className="countdown-fill"
                                    style={{
                                        strokeDasharray: `${2 * Math.PI * 17}`,
                                        strokeDashoffset: `${2 * Math.PI * 17 * (1 - nextCountdown / NEXT_QUESTION_DELAY)}`
                                    }}
                                />
                            </svg>
                            <span className="countdown-number">{nextCountdown}</span>
                        </div>
                        <span className="countdown-label">Next question in {nextCountdown}s</span>
                    </div>
                </div>
            </div>
        );
    }

    // ───────── Question Screen ─────────
    return (
        <div className="page">
            <div className="card glass game-card">
                {/* Header bar */}
                <div className="game-header">
                    <span className="game-room-code">{roomCode}</span>
                    <span className="game-question-num">Q{questionNumber}</span>
                </div>

                {/* Timer progress bar */}
                <div className="timer-container">
                    <div className="timer-bar-bg">
                        <div
                            className={`timer-bar-fill${timeLeft <= 5 ? ' timer-danger' : ''}`}
                            style={{ width: `${(timeLeft / roundTime) * 100}%` }}
                        />
                    </div>
                    <span className={`timer-text${timeLeft <= 5 ? ' timer-text-danger' : ''}`}>
                        {timerExpired ? '⏰ Time\'s up!' : `${timeLeft}s`}
                    </span>
                </div>

                {/* Question */}
                <h2 className="game-question">{question.question}</h2>

                {/* Options */}
                <div className="game-options">
                    {question.options.map((option, i) => (
                        <button
                            key={i}
                            className={getOptionClass(option)}
                            onClick={() => handleOptionClick(option)}
                            disabled={!!selectedOption || timerExpired}
                        >
                            <span className="option-letter">
                                {String.fromCharCode(65 + i)}
                            </span>
                            <span className="option-text">{option}</span>
                        </button>
                    ))}
                </div>

                {/* Waiting indicator after answering, before round end */}
                {(selectedOption || timerExpired) && (
                    <div className="game-waiting-result">
                        <div className="waiting-dots">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                        <p className="hint-text">Waiting for other players…</p>
                    </div>
                )}
            </div>
        </div>
    );
}