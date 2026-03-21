const rooms = new Map()

function getRoom(roomCode){
    let room = rooms.get(roomCode)
    return room
}

function setRoom(roomCode, room){
    rooms.set(roomCode, room)
}

module.exports = { getRoom, setRoom }