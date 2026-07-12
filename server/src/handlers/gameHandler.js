const { getRoom, setRoom, getSettings } = require("../Store");
const { getQuestionForRoom, getQuestion } = require("../common/QuestionHelper");
const _ = require("lodash");
const redisUtils = require("../common/redisUtils");
const { Constants } = require("../Constants");
const { checkAnswerAndCalculatePoints, addScore, initializeRoundData, updateRoundData, getLeaderboardKey, initializeRoomRoundData } = require("../common/GameHelper");
const { downloadFile } = require("../common/BucketUtils");
const { getTodayDate, getTodaysRemainingTTL } = require("../common/DateHelper");
const RedisUtils = require("../common/redisUtils");
const { getData, saveData } = require("../common/DBUtil");
const { response } = require("express");


// Multiplayer handler
async function handleRoomStartGame(io, socket, data) {
    console.log("handleRoomStartGame invoked")
    let username = data.username
    let roomCode = data.roomCode
    let playerData = data.playerData
    console.log(`@Server USERNAME : ${username} and ROOM CODE : ${roomCode}`)
    let room = getRoom(roomCode)
    let [settings, questionSet] = await Promise.all([downloadFile(Constants.FILES.SETTINGS), downloadFile(Constants.FILES.QUESTION.STANDARD)])
    let roundData = initializeRoomRoundData(settings)

    if (room) {
        room.status = "playing"
        // if (room.currentRound) {
        //     room.currentRound.playerAnswers = {}
        //     room.currentRound.playerPoints = {}  // separate map for time-based points
        // }
    }
    let currentQuestion = await getQuestionForRoom(roomCode, questionSet)
    _.set(currentQuestion, "playerAnswers", {})
    _.set(currentQuestion, "playerPoints", {})
    _.set(room, Constants.STRINGS.LAST_QUESTION, currentQuestion)
    _.set(room, Constants.STRINGS.ROUND_DATA, roundData)
    setRoom(roomCode, room)
    console.log("CURRENT QUESTION : " + JSON.stringify(currentQuestion))

    io.to(roomCode).emit("game:started", { username, roomCode, currentQuestion })
}

async function handleRoomSubmitAnswer(io, socket, data, context) {
    console.log("handlerSubmitAnswer invoked")
    let roomCode = data.roomCode
    let room = getRoom(roomCode)
    let userAnswer = data.answer
    let playerData = data.playerData
    let playerId = playerData.playerId
    let [settings] = await Promise.all([downloadFile(Constants.FILES.SETTINGS)])
    let lastQuestion = _.get(room, Constants.STRINGS.LAST_QUESTION)
    let roundData = _.get(room, Constants.STRINGS.ROUND_DATA)
    let playerAnswers = lastQuestion["playerAnswers"]
    let playerPoints = lastQuestion["playerPoints"]
    let leaderboardKey = _.get(room, Constants.STRINGS.LEADERBOARD_KEY)
    if (!room) return; // Prevent crash if server restarted and room doesn't exist

    let isRoundComplete = false
    let currentPlayerDataIndex = _.findIndex(room.roomPlayers, (currentPlayer) => { return currentPlayer && currentPlayer.socketId == socket.id })
    let username = room.roomPlayers[currentPlayerDataIndex].username
    playerAnswers[socket.id] = data.answer
    lastQuestion["playerAnswers"] = playerAnswers

    // if (_.toLower(data.answer) == _.toLower(room.currentRound.answer)) {
    //     if (currentPlayerDataIndex != -1) {
    //         const questionStartTime = room.currentRound.questionStartTime || Date.now()
    //         const timeElapsed = Date.now() - questionStartTime
    //         const timeFraction = Math.max(0, 1 - timeElapsed / ROUND_TIME_MS)
    //         pointsEarned = Math.round(MAX_POINTS * (MIN_SCORE_FACTOR + (1 - MIN_SCORE_FACTOR) * timeFraction))
    //         room.roomPlayers[currentPlayerDataIndex].score += pointsEarned
    //         playerPoints[socket.id] = pointsEarned  // stored separately — does NOT affect answer count
    //         lastQuestion["playerPoints"] = playerPoints
    //         console.log(`${socket.id} answered correctly in ${timeElapsed}ms → +${pointsEarned} pts`)
    //     }
    //     console.log(`Username : ${username} pointsEarned : ${pointsEarned}`)
    //     await redisUtils.incrementScore(leaderboardKey, username, pointsEarned)
    // }

    let { isAnswerCorrect, pointsEarned } = checkAnswerAndCalculatePoints(lastQuestion, userAnswer, settings)
    console.log("{ isAnswerCorrect, pointsEarned } : " + JSON.stringify({ isAnswerCorrect, pointsEarned }))
    room.roomPlayers[currentPlayerDataIndex].score += pointsEarned
    playerPoints[socket.id] = pointsEarned  // stored separately — does NOT affect answer count
    lastQuestion["playerPoints"] = playerPoints
    console.log(`${socket.id} answered correctly → +${pointsEarned} pts`)
    await new RedisUtils().incrementScore(leaderboardKey, playerId, pointsEarned)

    _.set(room, Constants.STRINGS.LAST_QUESTION, lastQuestion)
    setRoom(roomCode, room)

    // Check if ALL players have answered the current question
    if (_.keys(playerAnswers).length === room.roomPlayers.length) {
        // Check if all questions in the round are exhausted
        if (roundData.currentQuestion >= roundData.totalQuestionsPerRound) {
            isRoundComplete = true

            saveData(Constants.DB_TABLE.ROOM_DATA, room)
        }

        let leaderboard = await new RedisUtils().getAllEntries(leaderboardKey, settings.GAMEPLAY.TOP_N_PLAYERS)
        console.log("LEADERBOARD DATA @handleSubmitAnswer : " + JSON.stringify(leaderboard))
        leaderboard = leaderboard.map((ele, index) => {
            let currentPlayer = _.find(room.roomPlayers, (player) => { return player && player.playerId == ele.value })
            return {
                rank: index + 1,
                username: currentPlayer.username,
                score: ele.score
            }
        })
        room.status = "roundEnd"
        setRoom(roomCode, room)
        console.log("SCORES : ", room.roomPlayers)
        // Send per-player points earned this round to the UI
        const pointsThisRound = {}
        room.roomPlayers.forEach(p => {
            pointsThisRound[p.socketId] = playerPoints[p.socketId] || 0
        })
        io.to(roomCode).emit("game:roundEnd", { isRoundComplete, leaderboard, pointsThisRound })
    }
}

async function handleRoomNextQuestion(io, socket, data) {
    console.log("handleNextQuestion invoked")
    let roomCode = data.roomCode

    let room = getRoom(roomCode)
    if (!room) return;

    // Safety check: ignore duplicate nextQuestion requests from other players
    // resolving the issue where every player emitting nextQuestion burned N questions at once
    if (room.status !== "roundEnd") {
        console.log(`Skipping duplicate handleNextQuestion for ${roomCode}`);
        return;
    }

    // Mark as playing so subsequent requests are ignored
    room.status = "playing"

    // Increment the question counter in roundData
    let roundData = _.get(room, Constants.STRINGS.ROUND_DATA)
    roundData.currentQuestion += 1
    _.set(room, Constants.STRINGS.ROUND_DATA, roundData)

    // Fetch questionSet and get the next question
    let [questionSet] = await Promise.all([downloadFile(Constants.FILES.QUESTION.STANDARD)])
    let currentQuestion = await getQuestionForRoom(roomCode, questionSet)
    console.log("CURRENT QUESTION @handleNextQuestion : " + JSON.stringify(currentQuestion))

    // Initialize tracking fields on the new question
    _.set(currentQuestion, "playerAnswers", {})
    _.set(currentQuestion, "playerPoints", {})
    _.set(room, Constants.STRINGS.LAST_QUESTION, currentQuestion)

    setRoom(roomCode, room)
    io.to(roomCode).emit("game:question", { currentQuestion })
}

// Single Player Handlers
async function startGameHandler(req, res, context) {
    console.info("startGameHandler invoked")
    let response = {}
    try {
        const [settings, resource, questionSet] = await Promise.all([downloadFile(Constants.FILES.SETTINGS), downloadFile(Constants.FILES.RESOURCE), downloadFile(Constants.FILES.QUESTION.STANDARD)])
        let request = req.body
        let userData = _.get(context, Constants.STRINGS.USER_DATA)
        let playerId = _.get(userData, Constants.STRINGS.PLAYER_ID)
        let roundData = _.get(userData, Constants.STRINGS.ROUND_DATA) || {}
        let lastPlayedDate = _.get(userData, Constants.STRINGS.LAST_PLAYED_DATE)
        let sessionCount = _.get(userData, Constants.STRINGS.SESSION_COUNT) || 0
        let todaysDate = getTodayDate()
        let subscriptionDetails = _.get(userData, Constants.STRINGS.SUBSCRIPTION_DETAILS) || {}
        sessionCount += 1

        console.log(`LAST PLAYED DATE : ${lastPlayedDate}, TODAYS DATE : ${todaysDate}`)
        console.log("ROUND DATA : " + JSON.stringify(roundData))

        if (lastPlayedDate != todaysDate) {
            // new user
            roundData = initializeRoundData(context, settings)
            let todaysLeaderboardKey = getLeaderboardKey(context, "SINGLE_PLAYER")
            console.log("TODAYS LEADERBOARD KEY : " + todaysLeaderboardKey)
            let todaysRemainingTTL = getTodaysRemainingTTL()
            await new RedisUtils().createTodaysKey(todaysLeaderboardKey, playerId, 0, todaysRemainingTTL)
            _.set(userData, Constants.STRINGS.LAST_PLAYED_DATE, todaysDate)
        } else if (lastPlayedDate == todaysDate && roundData.currentRound < roundData.totalRounds) {
            // same day, but rounds are pending
            roundData = updateRoundData(context, settings)
        } else if (lastPlayedDate == todaysDate && roundData.currentRound >= roundData.totalRounds) {
            // rounds exhausted
            return roundEndHelper(req, res, context)
        }

        let instructionText = resource.SINGLE_PLAYER_MODE_INSTRUCTION
        let toShowInstructionScreen = (sessionCount < 4)
        let batchSize = (subscriptionDetails.status == "active") ? settings.GAMEPLAY.SINGLE_PLAYER_QUESTION_COUNT : settings.GAMEPLAY.SINGLE_PLAYER_QUESTION_COUNT
        let question = await getQuestion(context, batchSize, settings, questionSet)
        _.set(userData, Constants.STRINGS.LAST_QUESTION, question)
        _.set(userData, Constants.STRINGS.SESSION_COUNT, sessionCount)

        response = {
            status: 200,
            success: true,
            message: "",
            data: {
                toShowInstructionScreen: toShowInstructionScreen,
                totalQuestionsPerRound: roundData.totalQuestionsPerRound,
                instructionScreenData: {
                    instructionText: instructionText,
                },
                questionScreenData: {
                    question: question,
                }
            }
        }

        return response
    } catch (err) {
        console.error("Error @startGameHandler : ")
        console.error(err)
        response = { status: 500, success: false, error: "Internal server error" }
        return response
    }
}

async function submitAnswerHandler(req, res, context) {
    console.info("submitAnswerHandler invoked")
    let response = {}
    try {
        const [settings, questionSet] = await Promise.all([downloadFile(Constants.FILES.SETTINGS), downloadFile(Constants.FILES.QUESTION.STANDARD)])
        let request = req.body
        let answer = request.answer
        let userData = _.get(context, Constants.STRINGS.USER_DATA)
        let roundData = _.get(userData, Constants.STRINGS.ROUND_DATA)
        let lastQuestion = _.get(userData, Constants.STRINGS.LAST_QUESTION)
        let score = _.get(userData, Constants.STRINGS.SCORE)
        let isRoundComplete = false
        let question = {}

        let { isAnswerCorrect, pointsEarned } = checkAnswerAndCalculatePoints(lastQuestion, answer, settings)
        console.log("{ isAnswerCorrect, pointsEarned } : " + JSON.stringify({ isAnswerCorrect, pointsEarned }))
        if (isAnswerCorrect) await addScore(context, pointsEarned)
        roundData = updateRoundData(context)
        if (roundData.currentQuestion > roundData.totalQuestionsPerRound) {
            isRoundComplete = true
        } else {
            question = await getQuestion(context, settings.GAMEPLAY.SUBSCRIBER.SINGLE_PLAYER_QUESTION_COUNT, settings, questionSet)
            _.set(userData, Constants.STRINGS.LAST_QUESTION, question)
        }

        response = {
            status: 200,
            success: true,
            message: "",
            data: {
                isRoundComplete: isRoundComplete,
                answerScreenData: {
                    isCorrect: isAnswerCorrect,
                    roundScore: roundData.currentRoundScore
                },
                questionScreenData: {
                    question: question
                },
                roundEndScreenData: {}
            }
        }
        return response
    } catch (err) {
        console.error("Error @submitAnswerHandler : ")
        console.error(err)
        response = {
            status: 500,
            success: false,
            error: "Internal server error"
        }
        return response
    }
}

async function roundEndHelper(req, res, context) {
    console.info("roundEndHelper invoked")
    try {


    } catch (err) {
        console.error("Error @roundHelper: ")
        console.error(err)
    }

}
module.exports = { handleRoomStartGame, handleRoomSubmitAnswer, handleRoomNextQuestion, startGameHandler, submitAnswerHandler }