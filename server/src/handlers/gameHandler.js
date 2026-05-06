const { getRoom, setRoom, getSettings } = require("../store");
const { getQuestionSet, getQuestion } = require("../utils/QuestionHelper");
const _ = require("lodash");
const redisUtils = require("../utils/redisUtils");

// const POINTS_PER_QUESTION = 10

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
        }
    }

    let currentQuestion = await getQuestion(roomCode)
    console.log("CURRENT QUESTION : " + JSON.stringify(currentQuestion))

    io.to(roomCode).emit("game:started", { username, roomCode, currentQuestion })

}

async function handleSubmitAnswer(io, socket, data) {
    console.log("handlerSubmitAnswer invoked")
    let roomCode = data.roomCode

    let room = getRoom(roomCode)
    let setting = getSettings(roomCode)
    if (!room) return; // Prevent crash if server restarted and room doesn't exist

    let currentRound = room.currentRound
    let questions = room.questions
    let playerAnswers = currentRound.playerAnswers
    let isGameComplete = false
    let currentPlayerDataIndex = _.findIndex(room.players, (currentPlayer) => { return currentPlayer && currentPlayer.socketId == socket.id })
    let username = room.players[currentPlayerDataIndex].username

    // console.log("PLAYER ANSWERS before : " + JSON.stringify(playerAnswers))
    playerAnswers[socket.id] = data.answer
    room.currentRound.playerAnswers = playerAnswers

    if (_.toLower(data.answer) == _.toLower(room.currentRound.answer)) {
        if (currentPlayerDataIndex != -1) {
            room.players[currentPlayerDataIndex].score += setting.POINTS_PER_QUESTION
        }
        await redisUtils.incrementScore(`leaderboard::${roomCode}`, username, setting.POINTS_PER_QUESTION)
    }
    setRoom(roomCode, room)
    // console.log("PLAYER ANSWERS after : " + JSON.stringify(playerAnswers))

    if (_.keys(playerAnswers).length == room.players.length) {
        //roundEnd logic(after every question)
        if (questions.length == 0) {
            // gameEnd logic
            isGameComplete = true
            let playersList = room.players
            // rankList = _.orderBy(playersList, ["score"], ["desc"])
            // leaderboard = _.map(rankList, (ele) => { return { ...ele, rank: rankList.indexOf(ele) + 1 } })
        }
        let leaderboard = await redisUtils.getAllEntries(`leaderboard::${roomCode}`, setting.TOP_N_PLAYERS)
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
        io.to(roomCode).emit("game:roundEnd", { isGameComplete: isGameComplete, leaderboard: leaderboard })
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
    }

    let currentQuestion = await getQuestion(roomCode)
    console.log("CURRENT QUESTION @handleNextQuestion : " + JSON.stringify(currentQuestion))

    setRoom(roomCode, room)
    io.to(roomCode).emit("game:question", { currentQuestion })

}
module.exports = { handleStartGame, handleSubmitAnswer, handleNextQuestion }