const { getRoom, setRoom, getSettings } = require("../store");
// const { fetchQuestions } = require("./dbHelper");
const { downloadFile } = require("./BucketUtils")
const _ = require("lodash")

async function getQuestion(roomCode) {
    console.log("getQuestion invoked")
    let room = getRoom(roomCode)
    let setting = getSettings(roomCode)

    console.log("SETTINGS @getQuestion : " + JSON.stringify(setting))

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
        questionBatch = await fetchQuestions(setting.BATCH_SIZE)
        quesIndexes = _.range(0, questionBatch.length)
        let questionId = questionBatch.map((ele) => { return ele.id })
        console.log("QUESTION IDs : ", questionId)
        // room.questions.push(...questionBatch)
    }

    let quesIndex = _.random(0, questionBatch.length - 1)
    let currentQuestion = questionBatch[quesIndex]

    questionBatch.splice(quesIndex, 1)
    quesIndexes.splice(quesIndex, 1)

    console.log("QUES INDEXES AFTER : " + quesIndexes)

    room.questions = questionBatch
    room.currentRound.questionIndexes = quesIndexes || []
    room.currentRound.question = currentQuestion.question || ""
    room.currentRound.answer = currentQuestion.answer || ""
    setRoom(roomCode, room)

    return currentQuestion
}

async function fetchQuestions(BATCH_SIZE) {
    console.log("fetchQuestions invoked")
    let questionSet = await downloadFile("questions/standard.json")
    let randomIds = []
    // console.log("QUESTION : " + JSON.stringify(questionSet[0]))

    while (randomIds.length < BATCH_SIZE) {
        const id = _.random(0, questionSet.length - 1)
        if (!randomIds.includes(id)) randomIds.push(id)
    }

    console.log("RANDOM INDEXES : " + randomIds)

    let questionBatch = randomIds.map(id => questionSet[id])
    console.log("QUESTION BATCH : " + JSON.stringify(questionBatch))

    return questionBatch

}

// async function main() {
//     await getQuestionSet(10)
// }
// main()

module.exports = { getQuestion }