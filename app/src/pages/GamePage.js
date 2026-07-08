import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useJest } from "../context/JestContext";
import socket from "../socketConnection";
import GameEndScreen from "./GameEndScreen";
import axios from "axios";
import API from "../services/apiEndpoints";
import { getPlayerSigned } from "../services/jestService";

export default function GamePage() {
    console.log("GamePage invoked")
    const location = useLocation();
    const navigate = useNavigate();
    const { savedProfile } = useJest();
    const { roomCode, currentQuestion, roundTime: initialRoundTime, mode, totalQuestionsPerRound } = location.state || {};
    const isSinglePlayer = mode === "single-player";
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
        setIsAudioPlaying(true);
        audio.onended = () => setIsAudioPlaying(false);
        audio.onpause = () => setIsAudioPlaying(false);
        audio.play().catch((err) => {
            // Browsers may block autoplay — log silently
            console.warn("Audio playback blocked:", err);
            setIsAudioPlaying(false);
        });
    }, [stopAudio]);

    // Scoreboard screen state
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [isGameComplete, setIsGameComplete] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [nextCountdown, setNextCountdown] = useState(NEXT_QUESTION_DELAY);
    const [pointsEarned, setPointsEarned] = useState(null);
    const nextTimerRef = useRef(null);

    // Single-player state
    const [spScore, setSpScore] = useState(0);
    const [spCorrectCount, setSpCorrectCount] = useState(0);
    const [spAnswerResult, setSpAnswerResult] = useState(null); // { isCorrect, correctAnswer }
    const [spSubmitting, setSpSubmitting] = useState(false);
    const SP_FEEDBACK_DELAY = 3; // seconds to show answer feedback before next question

    // New question type state
    const [textAnswer, setTextAnswer] = useState("");
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);

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
        const isTextType = question?.answerType === "text";
        if (timerExpired && !selectedOption) {
            const answerToSubmit = isTextType ? (textAnswer.trim() || null) : null;
            if (isSinglePlayer) {
                handleSinglePlayerSubmit(answerToSubmit);
            } else {
                (async () => {
                    const signedData = await getPlayerSigned();
                    socket.emit("game:submitAnswer", {
                        roomCode,
                        answer: answerToSubmit,
                        playerSigned: signedData.playerSigned,
                        playerData: signedData.player,
                    });
                })();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerExpired, selectedOption, roomCode, isSinglePlayer]);

    // Stop timer when player selects an answer
    useEffect(() => {
        if (selectedOption) {
            clearTimer();
        }
    }, [selectedOption, clearTimer]);

    useEffect(() => {
        console.log(`USERNAME : ${username} || ROOM CODE : ${roomCode} || MODE : ${mode}`)
        if (!username || (!isSinglePlayer && !roomCode)) {
            console.log("USER NAME || ROOM CODE not found")
            navigate("/");
            return;
        }

        // Single-player mode doesn't use Socket.IO — skip listeners
        if (isSinglePlayer) return;

        const onQuestion = (data) => {
            // New question arriving — reset everything
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
            // Play the pre-generated voiceover MP3 from Firebase Storage
            if (q.audioUrl) playAudio(q.audioUrl);
        };

        const onRoundEnd = (data) => {
            // Round is over — show the scoreboard; stop voiceover
            clearTimer();
            stopAudio();
            if (data.roundTime) setRoundTime(data.roundTime);
            setIsGameComplete(data.isRoundComplete || false);
            setLeaderboard(data.leaderboard || []);

            // Show points earned this round
            const myPoints = data.pointsThisRound?.[socket.id] ?? null;
            setPointsEarned(myPoints);

            if (data.isRoundComplete) {
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
            stopAudio(); // clean up audio on unmount
        };
    }, [username, roomCode, navigate, questionNumber, clearTimer, clearNextTimer, playAudio, stopAudio]);

    // ── Single-player REST answer submission ──
    const handleSinglePlayerSubmit = async (answer) => {
        if (spSubmitting) return;
        setSpSubmitting(true);
        try {
            const signedData = await getPlayerSigned();
            const response = await axios.post(API.GAME.SUBMIT_ANSWER, {
                answer: answer,
                playerData: signedData.player
            }, {
                headers: { Authorization: signedData.playerSigned }
            });
            console.log("SUBMIT ANSWER RESPONSE : " + JSON.stringify(response.data.data))

            const { isRoundComplete, answerScreenData, questionScreenData, roundEndScreenData } = response.data.data;

            // Track score
            if (answerScreenData?.isCorrect) {
                setSpScore(answerScreenData?.roundScore);
                setSpCorrectCount(prev => prev + 1);
            }

            // Show answer feedback
            setSpAnswerResult({ isCorrect: answerScreenData.isCorrect, correctAnswer: question?.answer });
            clearTimer();
            stopAudio();

            if (isRoundComplete) {
                // Wait for feedback, then show game-end
                setTimeout(() => {
                    setSpAnswerResult(null);
                    setIsGameComplete(true);
                }, SP_FEEDBACK_DELAY * 1000);
            } else {
                let nextQuestion = questionScreenData.question
                // console.log("Next Question: ", nextQuestion)
                // Wait for feedback, then load next question
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
                    roomCode,
                    answer: option,
                    playerSigned: signedData.playerSigned,
                    playerData: signedData.player,
                });
            })();
        }
    };

    // Text answer submission
    const handleTextSubmit = () => {
        const trimmed = textAnswer.trim();
        if (!trimmed || selectedOption || timerExpired) return;
        setSelectedOption(trimmed); // mark as answered (reuse selectedOption as "answered" flag)

        if (isSinglePlayer) {
            handleSinglePlayerSubmit(trimmed);
        } else {
            (async () => {
                const signedData = await getPlayerSigned();
                socket.emit("game:submitAnswer", {
                    roomCode,
                    answer: trimmed,
                    playerSigned: signedData.playerSigned,
                    playerData: signedData.player,
                });
            })();
        }
    };

    const handleTextKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleTextSubmit();
        }
    };

    // Toggle audio replay
    const handleAudioReplay = () => {
        if (isAudioPlaying) {
            stopAudio();
        } else if (question?.audioUrl) {
            playAudio(question.audioUrl);
        }
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

    // Determine question and answer types
    const questionType = question?.questionType || "text";
    const answerType = question?.answerType || "options";

    const MEDAL = ["🥇", "🥈", "🥉"];

    if (!username || (!isSinglePlayer && !roomCode)) return null;



    // ───────── Game End Screen ─────────
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

    // ───────── SP Answer Feedback Screen ─────────
    if (isSinglePlayer && spAnswerResult) {
        return (
            <div className="page">
                <div className="card glass game-card">
                    {/* Header bar */}
                    <div className="game-header">
                        <span className="game-room-code">🎯 Solo</span>
                        <span className="game-question-num">Q{questionNumber}{totalQuestionsPerRound ? `/${totalQuestionsPerRound}` : ''}</span>
                    </div>

                    {/* Result banner */}
                    <div className={`answer-banner ${spAnswerResult.isCorrect ? 'answer-banner-correct' : 'answer-banner-incorrect'}`}>
                        <span className="answer-banner-icon">
                            {!selectedOption ? '⏰' : spAnswerResult.isCorrect ? '🎉' : '❌'}
                        </span>
                        <span className="answer-banner-text">
                            {!selectedOption
                                ? "Time's up!"
                                : spAnswerResult.isCorrect
                                    ? 'Correct!'
                                    : 'Wrong!'}
                        </span>
                    </div>

                    {/* Answer details */}
                    <div className="round-scoreboard">
                        {!spAnswerResult.isCorrect && (
                            <div className="answer-summary-row">
                                <span className="answer-summary-label">Correct answer</span>
                                <span className="answer-summary-value text-correct">
                                    {spAnswerResult.correctAnswer}
                                </span>
                            </div>
                        )}
                        <div className="answer-summary-row">
                            <span className="answer-summary-label">Your score</span>
                            <span className="answer-summary-value text-correct">
                                {spScore} pts
                            </span>
                        </div>
                        <div className="answer-summary-row">
                            <span className="answer-summary-label">Accuracy</span>
                            <span className="answer-summary-value">
                                {questionNumber > 0 ? Math.round((spCorrectCount / questionNumber) * 100) : 0}%
                            </span>
                        </div>
                    </div>

                    {/* Auto-advance indicator */}
                    <div className="next-question-countdown">
                        <span className="countdown-label">Next question loading…</span>
                    </div>
                </div>
            </div>
        );
    }

    // ───────── MP Scoreboard Screen ─────────
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
                    <span className="game-room-code">{isSinglePlayer ? '🎯 Solo' : roomCode}</span>
                    <span className="game-question-num">Q{questionNumber}{isSinglePlayer && totalQuestionsPerRound ? `/${totalQuestionsPerRound}` : ''}</span>
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
                <h2 className={`game-question${questionType === "emoji" ? " game-question-emoji" : ""}`}>
                    {question.question}
                </h2>

                {/* Conditional media block based on questionType */}
                {questionType === "image" && question.imageUrl && (
                    <div className="question-image-container">
                        {!imageLoaded && <span className="question-image-loading">Loading image…</span>}
                        <img
                            src={question.imageUrl}
                            alt="Question"
                            className="question-image"
                            style={!imageLoaded ? { display: 'none' } : {}}
                            onLoad={() => setImageLoaded(true)}
                        />
                    </div>
                )}

                {questionType === "emoji" && (
                    <div className="question-emoji">
                        {(question.question.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).join(' ')}
                    </div>
                )}

                {questionType === "audio" && question.audioUrl && (
                    <div className="question-audio-controls">
                        <button
                            className={`audio-play-btn${isAudioPlaying ? " audio-playing" : ""}`}
                            onClick={handleAudioReplay}
                            type="button"
                        >
                            <span className="audio-icon">{isAudioPlaying ? "⏸" : "▶️"}</span>
                            {isAudioPlaying ? "Playing…" : "Play Audio"}
                        </button>
                    </div>
                )}

                {/* Answer area */}
                {answerType === "options" && question.options && question.options.length > 0 ? (
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
                ) : (
                    <div className="text-answer-container">
                        <input
                            type="text"
                            className="text-answer-input"
                            placeholder="Type your answer…"
                            value={textAnswer}
                            onChange={(e) => setTextAnswer(e.target.value)}
                            onKeyDown={handleTextKeyDown}
                            disabled={!!selectedOption || timerExpired}
                            autoFocus
                        />
                        <button
                            className="text-answer-submit"
                            onClick={handleTextSubmit}
                            disabled={!!selectedOption || timerExpired || !textAnswer.trim()}
                        >
                            Submit
                        </button>
                    </div>
                )}

                {/* Waiting indicator after answering, before round end */}
                {(selectedOption || timerExpired) && !isSinglePlayer && (
                    <div className="game-waiting-result">
                        <div className="waiting-dots">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                        <p className="hint-text">Waiting for other players…</p>
                    </div>
                )}
                {/* SP: Show brief submitting indicator */}
                {(selectedOption || timerExpired) && isSinglePlayer && spSubmitting && (
                    <div className="game-waiting-result">
                        <div className="waiting-dots">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                        <p className="hint-text">Checking your answer…</p>
                    </div>
                )}
            </div>
        </div>
    );
}