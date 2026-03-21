const _ = require("lodash")
const { setRoom, getRoom } = require("../store")

function generateRoomCode() {
    return _.toUpper(Math.random().toString(36).substring(2, 8))
}

function handleCreateRoom(io, socket, data) {
    console.log("handleCreateRoom invoked")
    try {
        const roomCode = generateRoomCode()
        let username = data.username

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
                answers: {},
                questionIndexes: []
            }
        }
        setRoom(roomCode, roomData)
        // rooms.set(roomCode, {
        //     host: socket.id,
        //     players: [{
        //         socketId: socket.id,
        //         username,
        //         score: 0
        //     }],
        //     status: "waiting"
        // })

        socket.join(roomCode)
        socket.emit("room:created", {
            roomCode,
            message: `Room ${roomCode} created.`
        })

        console.log(`Room ${roomCode} created by ${username}`)

    } catch (err) {
        console.log("Error while created room: ", JSON.stringify(err))
    }
}

function handleJoinRoom(io, socket, data) {
    console.log("handlerJoinRoom invoked")
    try {
        let username = data.username
        let roomCode = data.roomCode
        let room = getRoom(roomCode)

        if (!room)
            return socket.emit("error", { message: "Room not found" })
        if (room.status != "waiting")
            return socket.emit("error", { message: "Game already in progress" })
        if (room.players.length >= 4)
            return socket.emit("error", { message: "Room is full" })

        room.players.push({
            socketId: socket.id,
            username,
            score: 0
        })

        setRoom(roomCode, room)

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