const _ = require("lodash")
const { setRoom, getRoom, setSettings, getSettings } = require("../store")
const { downloadFile } = require("../common/BucketUtils")
const RedisUtils = require("../common/redisUtils")
const { Constants } = require("../Constants")

let connectedPlayers = new Map()

function generateRoomCode() {
    return _.toUpper(Math.random().toString(36).substring(2, 8))
}

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

async function handleCreateRoom(io, socket, data) {
    console.log("handleCreateRoom invoked")
    try {
        const roomCode = generateRoomCode()
        let username = data.username
        let settings = await downloadFile(Constants.FILES.SETTINGS)

        console.log("SETTINGS : " + JSON.stringify(settings))
        let roomData = {
            host: socket.id,
            players: [{
                socketId: socket.id,
                username,
                score: 0
            }],
            status: "waiting",
            questions: [],
            currentRound: {
                question: "",
                answer: "",
                playerAnswers: {},
                questionIndexes: []
            }
        }
        setRoom(roomCode, roomData)
        setSettings(roomCode, settings)
        await new RedisUtils.createEntry(`leaderboard::${roomCode}`, username, settings.GAMEPLAY.LEADERBOARD_TTL_IN_SECONDS)

        socket.join(roomCode)
        socket.emit("room:created", {
            roomCode,
            message: `Room ${roomCode} created.`
        })

        console.log(`Room ${roomCode} created by ${username}`)

    } catch (err) {
        console.log("Error while created room: ")
        console.log(err)
    }
}

async function handleJoinRoom(io, socket, data) {
    console.log("handlerJoinRoom invoked")
    try {
        let username = data.username
        let roomCode = data.roomCode
        let room = getRoom(roomCode)
        let setting = getSettings(roomCode)

        if (!room)
            return socket.emit("error", { message: "Room not found" })
        if (room.status != "waiting")
            return socket.emit("error", { message: "Game already in progress" })
        if (room.players.length >= setting.GAMEPLAY.TOTAL_PLAYERS)
            return socket.emit("error", { message: "Room is full" })

        room.players.push({
            socketId: socket.id,
            username,
            score: 0
        })

        setRoom(roomCode, room)
        await RedisUtils.addEntry(`leaderboard::${roomCode}`, username)

        socket.join(roomCode)
        socket.emit("room:joined", {
            roomCode,
            players: room.players.map(player => player.username)
        })
        socket.to(roomCode).emit("room:player_joined", {
            username,
            players: room.players.map(player => player.username)
        })

        console.log(`${username} joined room ${roomCode}`)


    } catch (err) {
        console.log("Error while joining room : " + JSON.stringify(err))
    }

}

module.exports = { handleConnection, handleDisconnect, handleCreateRoom, handleJoinRoom }