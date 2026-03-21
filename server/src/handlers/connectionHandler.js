let connectedPlayers = new Map()

function handleConnection(socket) {
    console.log("handlerConnection invoked")
    connectedPlayers.set(socket.id, {
        socketId: socket.id,
    })

    socket.emit("connected", { message: "Connected to server", socketId: socket.id })
    console.log(`Player ${socket.id} successfully connected.`)
}

function handleDisconnect(io, socket) {
    console.log("handleDisconnect invoked")
    connectedPlayers.delete(socket.id)
    console.log(`Player ${socket.id} disconnected.`)
}

module.exports = { handleConnection, handleDisconnect }