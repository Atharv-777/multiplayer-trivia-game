const { handleStartGame, handleSubmitAnswer, handleNextQuestion } = require("./handlers/GameHandler")
const { handleConnection, handleCreateRoom, handleJoinRoom } = require("./handlers/roomHandler")

function registerSocketHandler(io) {
    io.on("connection", (socket) => {
        handleConnection(socket)
        socket.on("room:create", async (data) => await handleCreateRoom(io, socket, data))
        socket.on("room:join", async (data) => await handleJoinRoom(io, socket, data))
        socket.on("game:start", async (data) => await handleStartGame(io, socket, data))
        socket.on("game:submitAnswer", async (data) => await handleSubmitAnswer(io, socket, data))
        socket.on("game:nextQuestion", async (data) => await handleNextQuestion(io, socket, data))
    })
}

module.exports = { registerSocketHandler }