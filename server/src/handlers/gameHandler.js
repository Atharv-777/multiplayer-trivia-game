const { getRoom, setRoom, getSettings } = require("../store");
const { getQuestionSet, getQuestion } = require("../utils/QuestionHelper");
const _ = require("lodash")

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

function handleSubmitAnswer(io, socket, data) {
    console.log("handlerSubmitAnswer invoked")
    let roomCode = data.roomCode

    let room = getRoom(roomCode)
    let setting = getSettings(roomCode)
    if (!room) return; // Prevent crash if server restarted and room doesn't exist

    let currentRound = room.currentRound
    let playerAnswers = currentRound.playerAnswers
    let questions = room.questions
    let isGameComplete = false

    // console.log("PLAYER ANSWERS before : " + JSON.stringify(playerAnswers))
    playerAnswers[socket.id] = data.answer
    room.currentRound.playerAnswers = playerAnswers

    if (_.toLower(data.answer) == _.toLower(room.currentRound.answer)) {
        let currentPlayerDataIndex = _.findIndex(room.players, (currentPlayer) => { return currentPlayer && currentPlayer.socketId == socket.id })
        if (currentPlayerDataIndex != -1) {
            room.players[currentPlayerDataIndex].score += setting.POINTS_PER_QUESTION
        }
    }
    setRoom(roomCode, room)
    // console.log("PLAYER ANSWERS after : " + JSON.stringify(playerAnswers))

    if (_.keys(playerAnswers).length == room.players.length) {
        let leaderboard = []
        if (questions.length == 0) {
            isGameComplete = true
            let playersList = room.players
            rankList = _.orderBy(playersList, ["score"], ["desc"])
            leaderboard = _.map(rankList, (ele) => { return { ...ele, rank: rankList.indexOf(ele) + 1 } })

        }
        room.status = "roundEnd"
        setRoom(roomCode, room)
        console.log("SCORES : ", room.players)
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