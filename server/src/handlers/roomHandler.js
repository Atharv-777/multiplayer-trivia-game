const _ = require("lodash")
const { setRoom, getRoom, setSettings, getSettings } = require("../Store")
const { downloadFile } = require("../common/BucketUtils")
const RedisUtils = require("../common/redisUtils")
const { Constants } = require("../Constants")
const { getLeaderboardKey } = require("../common/GameHelper")
const { saveData, getData } = require("../common/DBUtil")
const { fetchFileteredQuestion } = require("../common/QuestionHelper")

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

async function handleCreateRoom(io, socket, data, context) {
    console.log("handleCreateRoom invoked")
    try {
        let [settings, questionSet] = await Promise.all([downloadFile(Constants.FILES.SETTINGS), downloadFile(Constants.FILES.QUESTION.STANDARD)])
        const roomCode = generateRoomCode()
        let username = data.username
        let playerData = data.playerData
        let userData = _.get(context, Constants.STRINGS.USER_DATA)
        let subscriptionDetails = _.get(userData, Constants.STRINGS.SUBSCRIPTION_DETAILS) || {}
        let playerId = _.get(userData, Constants.STRINGS.PLAYER_ID)
        if (subscriptionDetails.status != "active") {
            // later to handle this for non-subscriber 3 rooms cap  
        }

        console.log("SETTINGS : " + JSON.stringify(settings))
        // setSettings(roomCode, settings)
        let questionBatchForTheRound = await fetchFileteredQuestion(context, questionSet, settings.GAMEPLAY.MULTIPLAYER_QUESTION_COUNT)
        let multiplayerLeaderboardKey = getLeaderboardKey(context, "MULTIPLAYER", roomCode)
        console.log("LEADERBOARD KEY : " + multiplayerLeaderboardKey)
        await new RedisUtils().createEntry(multiplayerLeaderboardKey, playerId, settings.GAMEPLAY.LEADERBOARD_TTL_IN_SECONDS)

        let roomData = {
            roomId: roomCode,
            hostId: playerId,
            roomPlayers: [{
                socketId: socket.id,
                playerId: playerId,
                username,
                score: 0
            }],
            status: "waiting",
            nextQuestionBatch: questionBatchForTheRound,
            leaderboardKey: multiplayerLeaderboardKey
        }
        setRoom(roomCode, roomData)
        await saveData(Constants.DB_TABLE.ROOM_DATA, roomData)
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

async function handleJoinRoom(io, socket, data, context) {
    console.log("handlerJoinRoom invoked")
    try {
        let username = data.username
        let roomCode = data.roomCode
        let room = getRoom(roomCode)
        let userData = _.get(context, Constants.STRINGS.USER_DATA)
        let playerId = _.get(userData, Constants.STRINGS.PLAYER_ID)
        let [roomData] = await Promise.all([getData(Constants.DB_TABLE.ROOM_DATA, { roomId: roomCode })])
        let leaderboardKey = _.get(roomData, Constants.STRINGS.LEADERBOARD_KEY)

        if (!room)
            return socket.emit("error", { message: "Room not found" })
        if (room.status != "waiting")
            return socket.emit("error", { message: "Game already in progress" })
        // if (room.players.length >= setting.GAMEPLAY.TOTAL_PLAYERS)
        //     return socket.emit("error", { message: "Room is full" })
        let currentPlayer = {
            socketId: socket.id,
            playerId: playerId,
            username,
            score: 0
        }

        room.roomPlayers.push(currentPlayer)
        roomData.roomPlayers.push(currentPlayer)

        setRoom(roomCode, room)
        await new RedisUtils().addEntry(leaderboardKey, playerId)
        await saveData(Constants.DB_TABLE.ROOM_DATA, roomData)

        socket.join(roomCode)
        socket.emit("room:joined", { roomCode, players: room.roomPlayers.map(player => player.username) })
        socket.to(roomCode).emit("room:player_joined", { username, players: room.roomPlayers.map(player => player.username) })

        console.log(`${username} joined room ${roomCode}`)
    } catch (err) {
        console.error("Error while joining room : ")
        console.error(err)
    }

}

module.exports = { handleConnection, handleDisconnect, handleCreateRoom, handleJoinRoom }