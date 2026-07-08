const _ = require("lodash")
const { handleRoomStartGame, handleRoomSubmitAnswer, handleRoomNextQuestion } = require("./handlers/gameHandler")
const { handleConnection, handleDisconnect, handleCreateRoom, handleJoinRoom } = require("./handlers/roomHandler")
const { authenticateSocket, getContext } = require("./common/middleware")
const { saveData } = require("./common/DBUtil")
const { Constants } = require("./Constants")

/**
 * SocketEventMap — maps socket event names to handler functions.
 * Analogous to RouteMap for REST endpoints.
 * All handlers receive (io, socket, data, context).
 */
const SocketEventMap = {
    "room:create": handleCreateRoom,
    "room:join": handleJoinRoom,
    "game:start": handleRoomStartGame,
    "game:submitAnswer": handleRoomSubmitAnswer,
    "game:nextQuestion": handleRoomNextQuestion,
}

/**
 * socketHandler — centralized handler for all authenticated socket events.
 * Flow: authenticate → getContext → delegate to handler → saveData (if modified)
 * Mirrors routeHandler() in Router.js.
 */
async function socketHandler(io, socket, eventName, data) {
    console.log(`socketHandler invoked for event: ${eventName}`)
    try {
        console.log("DATA @socketHandler : " + JSON.stringify(data))
        // 1. Authenticate — verify JWT from data.playerSigned only on room creation and joining a room
        if (eventName == "room:create" || eventName == "room:join") {
            let authResp = authenticateSocket(data)
            if (!authResp.valid) {
                console.error(`Auth failed for event ${eventName}: ${authResp.error}`)
                // return socket.emit("error", { message: authResp.error })
            }
            let playerData = authResp.playerData
            let context = await getContext(playerData)
            const handler = SocketEventMap[eventName]
            if (!handler) {
                console.error(`No handler found for socket event: ${eventName}`)
                return socket.emit("error", { message: `Unknown event: ${eventName}` })
            }

            await handler(io, socket, data, context)
        } else {
            const handler = SocketEventMap[eventName]
            if (!handler) {
                console.error(`No handler found for socket event: ${eventName}`)
                return socket.emit("error", { message: `Unknown event: ${eventName}` })
            }
            await handler(io, socket, data)
        }

    } catch (err) {
        console.error(`Error handling socket event ${eventName}:`)
        console.error(err)
        socket.emit("error", { message: "Internal server error" })
    }
}

function registerSocketHandler(io) {
    io.on("connection", (socket) => {
        // Connection/disconnection are outside the centralized handler — no auth needed
        handleConnection(socket)
        socket.on("disconnect", () => handleDisconnect(io, socket))

        // Register all authenticated events through the centralized handler
        for (const eventName of Object.keys(SocketEventMap)) {
            socket.on(eventName, async (data) => await socketHandler(io, socket, eventName, data))
        }
    })
}

module.exports = { registerSocketHandler }