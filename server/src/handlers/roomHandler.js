const _ = require("lodash")
const { setRoom, getRoom, setSettings, getSettings } = require("../store")
const { downloadFile } = require("../utils/bucketUtils")
const RedisUtils = require("../utils/redisUtils")

function generateRoomCode() {
    return _.toUpper(Math.random().toString(36).substring(2, 8))
}

async function handleCreateRoom(io, socket, data) {
    console.log("handleCreateRoom invoked")
    try {
        const roomCode = generateRoomCode()
        let username = data.username
        let settings = await downloadFile("settings.json")

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
        await RedisUtils.createEntry(`leaderboard::${roomCode}`, username, settings.GAMEPLAY.LEADERBOARD_TTL_IN_SECONDS)

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

module.exports = { handleCreateRoom, handleJoinRoom }