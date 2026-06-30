const { getRoom, setRoom, getSettings } = require("../store");
const { getQuestionForRoom, getQuestion } = require("../common/QuestionHelper");
const _ = require("lodash");
const redisUtils = require("../common/redisUtils");
const { Constants } = require("../Constants");
const { checkAnswer, addScore } = require("../common/GameHelper");

async function handleStartGame(io, socket, data) {
    console.log("handleStartGame invoked")
    let username = data.username
    let roomCode = data.roomCode
    console.log(`@Server USERNAME : ${username} and ROOM CODE : ${roomCode}`)
    let room = getRoom(roomCode)

    if (room) {
        room.status = "playing"
        if (room.currentRound) {
            room.currentRound.playerAnswers = {}
            room.currentRound.playerPoints = {}  // separate map for time-based points
        }
    }

    let currentQuestion = await getQuestionForRoom(roomCode)
    console.log("CURRENT QUESTION : " + JSON.stringify(currentQuestion))

    io.to(roomCode).emit("game:started", { username, roomCode, currentQuestion })

}

async function handleSubmitAnswer(io, socket, data) {
    console.log("handlerSubmitAnswer invoked")
    let roomCode = data.roomCode

    let room = getRoom(roomCode)
    let setting = getSettings(roomCode)
    const ROUND_TIME_MS = (setting.GAMEPLAY.ROUND_TIME_IN_SECONDS || 15) * 1000      // must match ROUND_TIME on the client (15s)
    const MAX_POINTS = setting.GAMEPLAY.MAX_POINTS_PER_QUESTION || 100      // max points per correct answer
    const MIN_SCORE_FACTOR = setting.GAMEPLAY.MIN_SCORE_FACTOR || 0.5     // correct answer always gives at least 50 pts
    if (!room) return; // Prevent crash if server restarted and room doesn't exist

    let currentRound = room.currentRound
    let questions = room.questions
    let playerAnswers = currentRound.playerAnswers
    let playerPoints = currentRound.playerPoints || {}   // separate from playerAnswers
    let isGameComplete = false
    let currentPlayerDataIndex = _.findIndex(room.players, (currentPlayer) => { return currentPlayer && currentPlayer.socketId == socket.id })
    let username = room.players[currentPlayerDataIndex].username
    let pointsEarned = 0

    playerAnswers[socket.id] = data.answer
    room.currentRound.playerAnswers = playerAnswers

    if (_.toLower(data.answer) == _.toLower(room.currentRound.answer)) {
        if (currentPlayerDataIndex != -1) {
            const questionStartTime = room.currentRound.questionStartTime || Date.now()
            const timeElapsed = Date.now() - questionStartTime
            const timeFraction = Math.max(0, 1 - timeElapsed / ROUND_TIME_MS)
            pointsEarned = Math.round(MAX_POINTS * (MIN_SCORE_FACTOR + (1 - MIN_SCORE_FACTOR) * timeFraction))
            room.players[currentPlayerDataIndex].score += pointsEarned
            playerPoints[socket.id] = pointsEarned  // stored separately — does NOT affect answer count
            room.currentRound.playerPoints = playerPoints
            console.log(`${socket.id} answered correctly in ${timeElapsed}ms → +${pointsEarned} pts`)
        }
        console.log(`Username : ${username} pointsEarned : ${pointsEarned}`)
        await redisUtils.incrementScore(`leaderboard::${roomCode}`, username, pointsEarned)
    }
    setRoom(roomCode, room)

    if (_.keys(playerAnswers).length == room.players.length) {
        //roundEnd logic(after every question)
        if (questions.length == 0) {
            // gameEnd logic
            isGameComplete = true
            let playersList = room.players
            // rankList = _.orderBy(playersList, ["score"], ["desc"])
            // leaderboard = _.map(rankList, (ele) => { return { ...ele, rank: rankList.indexOf(ele) + 1 } })
        }
        let leaderboard = await redisUtils.getAllEntries(`leaderboard::${roomCode}`, setting.GAMEPLAY.TOP_N_PLAYERS)
        console.log("LEADERBOARD DATA @handleSubmitAnswer : " + JSON.stringify(leaderboard))
        leaderboard = leaderboard.map((ele, index) => {
            return {
                rank: index + 1,
                username: ele.value,
                score: ele.score
            }
        })
        room.status = "roundEnd"
        setRoom(roomCode, room)
        console.log("SCORES : ", room.players)
        // Send per-player points earned this round to the UI
        const pointsThisRound = {}
        room.players.forEach(p => {
            pointsThisRound[p.socketId] = playerPoints[p.socketId] || 0
        })
        io.to(roomCode).emit("game:roundEnd", { isGameComplete, leaderboard, pointsThisRound })
    }
}

async function handleNextQuestion(io, socket, data) {
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
    if (room.currentRound) {
        room.currentRound.playerAnswers = {}
        room.currentRound.playerPoints = {}  // reset points for next round
    }

    let currentQuestion = await getQuestionForRoom(roomCode)
    console.log("CURRENT QUESTION @handleNextQuestion : " + JSON.stringify(currentQuestion))

    setRoom(roomCode, room)
    io.to(roomCode).emit("game:question", { currentQuestion })

}

async function startGameHandler(req, res, context) {
    console.info("startGameHandler invoked")
    try {
        let request = req.body
        let playerData = request.playerData || {};
        let userData = _.get(context, Constants.STRINGS.USER_DATA)
        let question = await getQuestion(context)
        _.set(userData, Constants.STRINGS.LAST_QUESTION, question)
        return res.status(200).json({ question: question, success: true })
    } catch (err) {
        console.error("Error @startGameHandler : ")
        console.error(err)
        return res.status(500).json({ success: false, error: "Internal server error" })
    }
}

async function submitAnswerHandler(req, res, context) {
    console.info("submitAnswerHandler invoked")
    try {
        let request = req.body
        let answer = request.answer
        let userData = _.get(context, Constants.STRINGS.USER_DATA)

        let isAnswerCorrect = checkAnswer(context, answer)
        if (isAnswerCorrect) addScore(context)
        let question = getQuestion(context)
        _.set(userData, Constants.STRINGS.LAST_QUESTION, question)

        return res.status(200).json({ isCorrect: isAnswerCorrect, question: question })
    } catch (err) {
        console.error("Error @submitAnswerHandler : ")
        console.error(err)
        return res.status(500).json({ success: false, error: "Internal server error" })
    }
}
module.exports = { handleStartGame, handleSubmitAnswer, handleNextQuestion, startGameHandler, submitAnswerHandler }