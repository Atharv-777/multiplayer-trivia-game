import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import socket from "../socketConnection";
import GameEndScreen from "./GameEndScreen";
import axios from "axios";
import API from "../services/apiEndpoints";
import { getPlayerSigned } from "../services/jestService";

export default function GamePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { savedProfile } = useJest();
    const { roomCode, currentQuestion, roundTime: initialRoundTime, mode, totalQuestionsPerRound } = location.state || {};
    const isSinglePlayer = mode === "single-player";
    const username = location.state?.username || savedProfile?.username || "";

    const [roundTime, setRoundTime] = useState(initialRoundTime || 15);
    const NEXT_QUESTION_DELAY = 5;

    const [question, setQuestion] = useState(currentQuestion);

    // Play voiceover for the very first question
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
    const audioRef = useRef(null);

    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
    }, []);

    const playAudio = useCallback((url) => {
        if (!url) return;
        stopAudio();
        const audio = new Audio(url);
        audioRef.current = audio;
        setIsAudioPlaying(true);
        audio.onended = () => setIsAudioPlaying(false);
        audio.onpause = () => setIsAudioPlaying(false);
        audio.play().catch((err) => {
            console.warn("Audio playback blocked:", err);
            setIsAudioPlaying(false);
        });
    }, [stopAudio]);

    const [showScoreboard, setShowScoreboard] = useState(false);
    const [isGameComplete, setIsGameComplete] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [nextCountdown, setNextCountdown] = useState(NEXT_QUESTION_DELAY);
    const [pointsEarned, setPointsEarned] = useState(null);
    const nextTimerRef = useRef(null);

    // Single-player state
    const [spScore, setSpScore] = useState(0);
    const [spLastPointsEarned, setSpLastPointsEarned] = useState(0);
    const [spCorrectCount, setSpCorrectCount] = useState(0);
    const [spAnswerResult, setSpAnswerResult] = useState(null);
    const [spSubmitting, setSpSubmitting] = useState(false);
    const SP_FEEDBACK_DELAY = 3;

    const [textAnswer, setTextAnswer] = useState("");
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);

    const clearTimer = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }, []);

    const clearNextTimer = useCallback(() => {
        if (nextTimerRef.current) { clearInterval(nextTimerRef.current); nextTimerRef.current = null; }
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!question || showScoreboard) return;
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

    // Auto-submit on timer expire
    useEffect(() => {
        const isTextType = question?.answerType === "text";
        if (timerExpired && !selectedOption) {
            const answerToSubmit = isTextType ? (textAnswer.trim() || null) : null;
            if (isSinglePlayer) {
                handleSinglePlayerSubmit(answerToSubmit);
            } else {
                (async () => {
                    const signedData = await getPlayerSigned();
                    socket.emit("game:submitAnswer", {
                        roomCode, answer: answerToSubmit,
                        playerSigned: signedData.playerSigned, playerData: signedData.player,
                    });
                })();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerExpired, selectedOption, roomCode, isSinglePlayer]);

    useEffect(() => {
        if (selectedOption) clearTimer();
    }, [selectedOption, clearTimer]);

    useEffect(() => {
        if (!username || (!isSinglePlayer && !roomCode)) { navigate("/"); return; }
        if (isSinglePlayer) return;

        const onQuestion = (data) => {
            const q = data.currentQuestion || data;
            if (data.roundTime) setRoundTime(data.roundTime);
            setShowScoreboard(false);
            clearNextTimer();
            setQuestion(q);
            setQuestionNumber(q.questionNumber || questionNumber + 1);
            setSelectedOption(null);
            setTextAnswer("");
            setImageLoaded(false);
            setIsGameComplete(false);
            setLeaderboard([]);
            setNextCountdown(NEXT_QUESTION_DELAY);
            if (q.audioUrl) playAudio(q.audioUrl);
        };

        const onRoundEnd = (data) => {
            clearTimer();
            stopAudio();
            if (data.roundTime) setRoundTime(data.roundTime);
            setIsGameComplete(data.isRoundComplete || false);
            setLeaderboard(data.leaderboard || []);
            const myPoints = data.pointsThisRound?.[socket.id] ?? null;
            setPointsEarned(myPoints);

            if (!data.isRoundComplete) {
                setShowScoreboard(true);
                setNextCountdown(NEXT_QUESTION_DELAY);
                nextTimerRef.current = setInterval(() => {
                    setNextCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(nextTimerRef.current);
                            nextTimerRef.current = null;
                            (async () => {
                                const signedData = await getPlayerSigned();
                                socket.emit("game:nextQuestion", { roomCode, playerSigned: signedData.playerSigned, playerData: signedData.player });
                            })();
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
            stopAudio();
        };
    }, [username, roomCode, navigate, questionNumber, clearTimer, clearNextTimer, playAudio, stopAudio]);

    // ── SP Answer Submission ──
    const handleSinglePlayerSubmit = async (answer) => {
        if (spSubmitting) return;
        setSpSubmitting(true);
        try {
            const signedData = await getPlayerSigned();
            const response = await axios.post(API.GAME.SUBMIT_ANSWER, {
                answer, playerData: signedData.player
            }, { headers: { Authorization: signedData.playerSigned } });

            const { isRoundComplete, answerScreenData, questionScreenData } = response.data.data;

            const newScore = answerScreenData?.roundScore || spScore;
            const earned = answerScreenData?.isCorrect ? (newScore - spScore) : 0;
            if (answerScreenData?.isCorrect) {
                setSpScore(newScore);
                setSpLastPointsEarned(earned);
                setSpCorrectCount(prev => prev + 1);
            } else {
                setSpLastPointsEarned(0);
            }

            setSpAnswerResult({ isCorrect: answerScreenData.isCorrect, correctAnswer: question?.answer });
            clearTimer();
            stopAudio();

            if (isRoundComplete) {
                setTimeout(() => { setSpAnswerResult(null); setIsGameComplete(true); }, SP_FEEDBACK_DELAY * 1000);
            } else {
                const nextQuestion = questionScreenData.question;
                setTimeout(() => {
                    setSpAnswerResult(null);
                    setQuestion(nextQuestion);
                    setQuestionNumber(prev => prev + 1);
                    setSelectedOption(null);
                    setTextAnswer("");
                    setImageLoaded(false);
                    setTimerExpired(false);
                    setSpSubmitting(false);
                    if (nextQuestion?.audioUrl) playAudio(nextQuestion.audioUrl);
                }, SP_FEEDBACK_DELAY * 1000);
            }
        } catch (err) {
            console.error("Error submitting SP answer:", err);
            setSpSubmitting(false);
        }
    };

    const handleOptionClick = (option) => {
        if (selectedOption || timerExpired || showScoreboard) return;
        setSelectedOption(option);
        if (isSinglePlayer) {
            handleSinglePlayerSubmit(option);
        } else {
            (async () => {
                const signedData = await getPlayerSigned();
                socket.emit("game:submitAnswer", {
                    roomCode, answer: option,
                    playerSigned: signedData.playerSigned, playerData: signedData.player,
                });
            })();
        }
    };

    const handleTextSubmit = () => {
        const trimmed = textAnswer.trim();
        if (!trimmed || selectedOption || timerExpired) return;
        setSelectedOption(trimmed);
        if (isSinglePlayer) {
            handleSinglePlayerSubmit(trimmed);
        } else {
            (async () => {
                const signedData = await getPlayerSigned();
                socket.emit("game:submitAnswer", {
                    roomCode, answer: trimmed,
                    playerSigned: signedData.playerSigned, playerData: signedData.player,
                });
            })();
        }
    };

    const handleAudioReplay = () => {
        if (isAudioPlaying) stopAudio();
        else if (question?.audioUrl) playAudio(question.audioUrl);
    };

    const correctAnswer = question?.answer;
    const playerIsCorrect = selectedOption && selectedOption === correctAnswer;
    const questionType = question?.questionType || "text";
    const answerType = question?.answerType || "options";
    const MEDAL = ["🥇", "🥈", "🥉"];

    if (!username || (!isSinglePlayer && !roomCode)) return null;

    // ── Game End Screen ──
    if (isGameComplete) {
        if (isSinglePlayer) {
            return <GameEndScreen
                mode="single-player"
                username={username}
                score={spScore}
                correctCount={spCorrectCount}
                totalQuestions={totalQuestionsPerRound || questionNumber}
            />;
        }
        return <GameEndScreen leaderboard={leaderboard} username={username} />;
    }

    // ── Get Ready (no question yet) ──
    if (!question) {
        return (
            <div className="page">
                <div className="get-ready-screen">
                    <span className="get-ready-emoji">🚀</span>
                    <h2 className="get-ready-title">Get Ready!</h2>
                    <p className="get-ready-subtitle">Waiting for the first question…</p>
                    <div className="waiting-dots">
                        <span className="dot" /><span className="dot" /><span className="dot" />
                    </div>
                </div>
            </div>
        );
    }

    // ── SP Answer Feedback Screen (Screens 7 & 8) ──
    if (isSinglePlayer && spAnswerResult) {
        const isCorrect = spAnswerResult.isCorrect;
        const isTimeout = !selectedOption;
        const progressPct = totalQuestionsPerRound
            ? Math.round((questionNumber / totalQuestionsPerRound) * 100)
            : 0;

        return (
            <div className="page">
                <div className="game-screen">
                    {/* Header */}
                    <div className="game-header">
                        <button className="btn-close-game" onClick={() => navigate("/")}>✕</button>
                        <div className={`timer-ring expired`}>00</div>
                        <div style={{ width: 34 }} />
                    </div>

                    {/* Result Icon + Text */}
                    <div className="feedback-icon-container">
                        <div className={`circle-result ${isTimeout ? "circle-timeout" : isCorrect ? "circle-correct" : "circle-wrong"}`}>
                            {isTimeout ? "⏰" : isCorrect ? "✓" : "✗"}
                        </div>
                        <h2 className={`feedback-text ${isTimeout ? "timeout" : isCorrect ? "correct" : "wrong"}`}>
                            {isTimeout ? "Time's Up!" : isCorrect ? "Correct!" : "Oops!"}
                        </h2>
                        <div className={`points-badge ${isCorrect ? "earned" : "zero"}`}>
                            {isCorrect ? `+${spLastPointsEarned} points` : "+0 points"}
                        </div>
                    </div>

                    {/* Question recap */}
                    <div className="question-recap">
                        {question?.question}
                        <br />
                        <span className={`recap-answer-chip ${isCorrect ? "correct" : "wrong"}`}>
                            {spAnswerResult.correctAnswer}
                        </span>
                    </div>

                    {/* Show options with correct/wrong highlighted on wrong answer */}
                    {!isCorrect && question?.options && (
                        <div className="feedback-options-list">
                            {question.options.map((opt, i) => {
                                let cls = "option-button";
                                if (opt === spAnswerResult.correctAnswer) cls += " correct";
                                else if (opt === selectedOption) cls += " wrong";
                                else cls += " dimmed";
                                return (
                                    <button key={i} className={cls} disabled>{opt}</button>
                                );
                            })}
                        </div>
                    )}

                    {/* Round Progress Card */}
                    <div className="round-progress-card">
                        <div className="scoreboard-header-text">Round Progress</div>
                        <div className="progress-detail-row">
                            <span>Current Score</span>
                            <span className="value-primary">{spScore} pts</span>
                        </div>
                        <div className="progress-detail-row">
                            <span>Questions Completed</span>
                            <span>{questionNumber} / {totalQuestionsPerRound || "?"}</span>
                        </div>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── MP Scoreboard Screen (Screen 6) ──
    if (showScoreboard) {
        const isTimeout = !selectedOption;

        return (
            <div className="page">
                <div className="game-screen">
                    {/* Header */}
                    <div className="game-header">
                        <button className="btn-close-game" onClick={() => navigate("/")}>✕</button>
                        <div className="timer-ring expired">00</div>
                        <div style={{ width: 34 }} />
                    </div>

                    {/* Result Icon */}
                    <div className="feedback-icon-container">
                        <div className={`circle-result ${isTimeout ? "circle-timeout" : playerIsCorrect ? "circle-correct" : "circle-wrong"}`}>
                            {isTimeout ? "⏰" : playerIsCorrect ? "✓" : "✗"}
                        </div>
                        <h2 className={`feedback-text ${isTimeout ? "timeout" : playerIsCorrect ? "correct" : "wrong"}`}>
                            {isTimeout ? "Time's Up!" : playerIsCorrect ? "Correct!" : "Oops!"}
                        </h2>
                        {pointsEarned !== null && (
                            <div className={`points-badge ${pointsEarned > 0 ? "earned" : "zero"}`}>
                                {pointsEarned > 0 ? `+${pointsEarned} points` : "+0 points"}
                            </div>
                        )}
                    </div>

                    {/* Question recap */}
                    <div className="question-recap">
                        {question?.question}
                        <br />
                        <span className="recap-answer-chip correct">{correctAnswer}</span>
                    </div>

                    {/* Live Scoreboard */}
                    <div className="scoreboard-card">
                        <div className="scoreboard-header-text">Live Scoreboard</div>
                        <div className="scoreboard-list">
                            {leaderboard.map((player, index) => {
                                const isYou = player.username === username;
                                return (
                                    <div key={player.username} className={`scoreboard-row ${isYou ? "highlighted" : ""}`}>
                                        <div className="scoreboard-player-name">
                                            {MEDAL[index] ?? `#${index + 1}`} {player.username}
                                            {isYou && <span style={{ fontSize: "0.75rem", color: "var(--color-primary)" }}> (YOU)</span>}
                                        </div>
                                        <div className="scoreboard-player-pts">{player.score} pts</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Countdown to next */}
                    <div className="next-question-countdown">
                        <div className="countdown-ring">
                            <svg viewBox="0 0 40 40" className="countdown-svg">
                                <circle cx="20" cy="20" r="17" className="countdown-track" />
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

    // ── Question Screen (Screen 5) ──
    const timerDanger = timeLeft <= 5 && !timerExpired;

    return (
        <div className="page">
            <div className="game-screen">
                {/* ── Question Panel (top 35%) ── */}
                <div className="question-panel">
                    {/* Header: close btn | timer ring | spacer */}
                    <div className="game-header">
                        <button className="btn-close-game" onClick={() => navigate("/")} id="btn-close-game">✕</button>
                        <div className={`timer-ring ${timerDanger ? "danger" : ""} ${timerExpired ? "expired" : ""}`}>
                            {timerExpired ? "00" : String(timeLeft).padStart(2, "0")}
                        </div>
                        <div style={{ width: 34 }} />
                    </div>

                    {/* Image question */}
                    {questionType === "image" && question.imageUrl && (
                        <div className="question-image-box">
                            {!imageLoaded && <span className="question-image-loading">Loading image…</span>}
                            <img
                                src={question.imageUrl}
                                alt="Question"
                                style={!imageLoaded ? { display: "none" } : {}}
                                onLoad={() => setImageLoaded(true)}
                            />
                        </div>
                    )}

                    {/* Audio controls */}
                    {questionType === "audio" && question.audioUrl && (
                        <div className="question-audio-controls">
                            <button
                                className={`audio-play-btn${isAudioPlaying ? " audio-playing" : ""}`}
                                onClick={handleAudioReplay}
                                type="button"
                                id="btn-audio-play"
                            >
                                <span>{isAudioPlaying ? "⏸" : "▶️"}</span>
                                {isAudioPlaying ? "Playing…" : "Play Audio"}
                            </button>
                        </div>
                    )}

                    {/* Question counter + text */}
                    <div className="question-counter">
                        Question {questionNumber}{isSinglePlayer && totalQuestionsPerRound ? ` of ${totalQuestionsPerRound}` : ""}
                    </div>
                    <h3 className={`question-text${questionType === "emoji" ? " emoji-type" : ""}`}>
                        {question.question}
                    </h3>

                    {/* Emoji display */}
                    {questionType === "emoji" && (
                        <div className="question-emoji-display">
                            {(question.question.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).join(" ")}
                        </div>
                    )}
                </div>

                {/* ── Answer Panel (bottom 65%) ── */}
                <div className="answer-panel">
                    {answerType === "options" && question.options?.length > 0 ? (
                        <div className="options-list">
                            {question.options.map((option, i) => {
                                let cls = "option-button";
                                if (selectedOption === option) cls += " selected";
                                else if ((selectedOption || timerExpired) && option !== selectedOption) cls += " dimmed";
                                return (
                                    <button
                                        key={i}
                                        id={`option-${i}`}
                                        className={cls}
                                        onClick={() => handleOptionClick(option)}
                                        disabled={!!selectedOption || timerExpired}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-answer-container">
                            <input
                                type="text"
                                className="text-answer-input"
                                placeholder="Type your answer…"
                                value={textAnswer}
                                onChange={(e) => setTextAnswer(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                                disabled={!!selectedOption || timerExpired}
                                autoFocus
                                id="text-answer-input"
                            />
                            <button
                                className="btn-primary"
                                onClick={handleTextSubmit}
                                disabled={!!selectedOption || timerExpired || !textAnswer.trim()}
                                id="btn-text-submit"
                            >
                                Submit
                            </button>
                        </div>
                    )}

                    {/* MP: Waiting for other players */}
                    {(selectedOption || timerExpired) && !isSinglePlayer && (
                        <div className="game-waiting-indicator">
                            <div className="waiting-dots">
                                <span className="dot" /><span className="dot" /><span className="dot" />
                            </div>
                            <p>Waiting for other players…</p>
                        </div>
                    )}

                    {/* SP: Checking answer */}
                    {(selectedOption || timerExpired) && isSinglePlayer && spSubmitting && (
                        <div className="game-waiting-indicator">
                            <div className="waiting-dots">
                                <span className="dot" /><span className="dot" /><span className="dot" />
                            </div>
                            <p>Checking your answer…</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
