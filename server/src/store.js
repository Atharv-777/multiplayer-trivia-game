const rooms = new Map()
const settings = new Map()

function getRoom(roomCode) {
    let room = rooms.get(roomCode)
    return room
}

function setRoom(roomCode, room) {
    rooms.set(roomCode, room)
}

function setSettings(settingsId, setting) {
    settings.set(settingsId, setting)
}

function getSettings(settingsId) {
    let setting = settings.get(settingsId)
    return setting
}

module.exports = { getRoom, setRoom, setSettings, getSettings }