import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../socketConnection";
import GameEndScreen from "./GameEndScreen";

export default function GamePage() {
    console.log("GamePage invoked")
    const location = useLocation();
    const navigate = useNavigate();
    const { username, roomCode, currentQuestion } = location.state || {};
    console.log("CURRENT QUESTION : " + JSON.stringify(currentQuestion))

    const ROUND_TIME = 15; // seconds
    const NEXT_QUESTION_DELAY = 5; // seconds to show answer screen

    const [question, setQuestion] = useState(currentQuestion);
    const [selectedOption, setSelectedOption] = useState(null);
    const [questionNumber, setQuestionNumber] = useState(1);
    const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
    const [timerExpired, setTimerExpired] = useState(false);
    const timerRef = useRef(null);

    // Answer screen state
    const [showAnswerScreen, setShowAnswerScreen] = useState(false);
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
        if (!question || showAnswerScreen) return;

        // Reset timer state
        setTimeLeft(ROUND_TIME);
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
    }, [question, showAnswerScreen, clearTimer]);

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
            setShowAnswerScreen(false);
            clearNextTimer();
            setQuestion(q);
            setQuestionNumber(q.questionNumber || questionNumber + 1);
            setSelectedOption(null);
            setIsGameComplete(false);
            setNextCountdown(NEXT_QUESTION_DELAY);
        };

        const onRoundEnd = (data) => {
            // Round is over — show the answer screen
            clearTimer();
            setIsGameComplete(data.isGameComplete || false);

            // Show points earned this round
            const myPoints = data.pointsThisRound?.[socket.id] ?? null;
            setPointsEarned(myPoints);

            if (data.isGameComplete) {
                // Game finished — store leaderboard and show end screen
                setLeaderboard(data.leaderboard || []);
            } else {
                // Still playing — show answer screen then countdown
                setShowAnswerScreen(true);
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
        };
    }, [username, roomCode, navigate, questionNumber, clearTimer, clearNextTimer]);

    const handleOptionClick = (option) => {
        if (selectedOption || timerExpired || showAnswerScreen) return;
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

        if (!showAnswerScreen) {
            // Still playing — just highlight selected
            if (selectedOption === option) cls += " selected";
            if ((selectedOption || timerExpired) && selectedOption !== option) cls += " disabled";
        } else {
            // Answer screen — reveal correct / incorrect
            if (option === correctAnswer) cls += " correct";
            else if (selectedOption === option) cls += " incorrect";
            else cls += " disabled";
        }

        return cls;
    };

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

    // ───────── Answer Screen ─────────
    if (showAnswerScreen) {
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
                                ? "Time's up! You didn't answer"
                                : playerIsCorrect
                                    ? 'Correct!'
                                    : 'Wrong!'}
                        </span>
                    </div>

                    {/* Question with correct answer highlighted */}
                    <h2 className="game-question answer-screen-question">{question.question}</h2>

                    <div className="game-options">
                        {question.options.map((option, i) => (
                            <div
                                key={i}
                                className={getOptionClass(option)}
                            >
                                <span className="option-letter">
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span className="option-text">{option}</span>
                                {option === correctAnswer && (
                                    <span className="option-check">✓</span>
                                )}
                                {selectedOption === option && option !== correctAnswer && (
                                    <span className="option-cross">✗</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Your answer summary */}
                    <div className="answer-summary">
                        <div className="answer-summary-row">
                            <span className="answer-summary-label">Your answer</span>
                            <span className={`answer-summary-value ${playerIsCorrect ? 'text-correct' : 'text-incorrect'}`}>
                                {selectedOption || 'No answer'}
                            </span>
                        </div>
                        <div className="answer-summary-row">
                            <span className="answer-summary-label">Correct answer</span>
                            <span className="answer-summary-value text-correct">{correctAnswer}</span>
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
                            style={{ width: `${(timeLeft / ROUND_TIME) * 100}%` }}
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