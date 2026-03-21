const { handleConnection } = require("./handlers/connectionHandler")
const { handleStartGame, handleSubmitAnswer, handleNextQuestion } = require("./handlers/gameHandler")
const { handleCreateRoom, handleJoinRoom } = require("./handlers/roomHandler")

function registerSocketHandler(io) {
    io.on("connection", (socket) => {
        handleConnection(socket)
        socket.on("room:create", (data) => handleCreateRoom(io, socket, data))
        socket.on("room:join", (data) => handleJoinRoom(io, socket, data))
        socket.on("game:start", (data) => handleStartGame(io, socket, data))
        socket.on("game:submitAnswer", (data) => handleSubmitAnswer(io, socket, data))
        socket.on("game:nextQuestion", (data) => handleNextQuestion(io, socket, data))
    })
}

module.exports = { registerSocketHandler }