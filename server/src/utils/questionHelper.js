const { getRoom, setRoom } = require("../store");
const { fetchQuestions } = require("./dbHelper");
const _ = require("lodash")

async function getQuestion(roomCode) {
    console.log("getQuestion invoked")
    let room = getRoom(roomCode)

    // Safety check: if room doesn't exist (e.g. server restarted), return a dummy or null
    if (!room || !room.questions) {
        console.error(`Room ${roomCode} not found in memory (server probably restarted).`);
        return null;
    }

    let questionBatch = room.questions || []
    let currentRound = room.currentRound
    let quesIndexes = currentRound.questionIndexes || []

    console.log("QUESTION INDEXES BEFORE : " + quesIndexes)

    if (questionBatch.length == 0) {
        questionBatch = await fetchQuestions(10)
        quesIndexes = _.range(0, questionBatch.length)
        // room.questions.push(...questionBatch)
    }

    let quesIndex = _.random(0, questionBatch.length - 1)
    let currentQuestion = questionBatch[quesIndex]

    questionBatch.splice(quesIndex, 1)
    quesIndexes.splice(quesIndex, 1)

    console.log("QUES INDEXES AFTER : " + quesIndexes)

    room.questions = questionBatch
    room.currentRound.questionIndexes = quesIndexes
    setRoom(roomCode, room)

    return currentQuestion
}

module.exports = { getQuestion }