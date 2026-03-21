const { getRoom, setRoom } = require("../store");
const { getQuestion } = require("../utils/QuestionHelper");
const _ = require("lodash")

async function handleStartGame(io, socket, data) {
    console.log("handleStartGame invoked")
    let username = data.username
    let roomCode = data.roomCode
    console.log(`@Server USERNAME : ${username} and ROOM CODE : ${roomCode}`)

    let room = getRoom(roomCode)
    if (room) {
        room.status = "playing"
        if (room.currentRound) {
            room.currentRound.answers = {}
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
    if (!room) return; // Prevent crash if server restarted and room doesn't exist

    let currentRound = room.currentRound
    let playerAnswers = currentRound.answers
    let questions = room.questions
    let isGameComplete = false

    // console.log("PLAYER ANSWERS before : " + JSON.stringify(playerAnswers))
    playerAnswers[socket.id] = data.answer
    room.currentRound.answers = playerAnswers
    setRoom(roomCode, room)
    // console.log("PLAYER ANSWERS after : " + JSON.stringify(playerAnswers))

    if (_.keys(playerAnswers).length == room.players.length) {
        if (questions.length == 0) isGameComplete = true
        room.status = "roundEnd"
        setRoom(roomCode, room)
        io.to(roomCode).emit("game:roundEnd", { isGameComplete: isGameComplete })
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
        room.currentRound.answers = {}
    }

    let currentQuestion = await getQuestion(roomCode)
    console.log("CURRENT QUESTION @handleNextQuestion : " + JSON.stringify(currentQuestion))

    setRoom(roomCode, room)

    io.to(roomCode).emit("game:question", { currentQuestion })

}
module.exports = { handleStartGame, handleSubmitAnswer, handleNextQuestion }