const { Constants } = require("../Constants");
const { getRoom, setRoom, getSettings } = require("../Store");
// const { fetchQuestions } = require("./dbHelper");
const { downloadFile } = require("./BucketUtils")
const _ = require("lodash");
const { getData, saveData } = require("./DBUtil");
const { getRandomElement } = require("./Common");


async function getQuestionForRoom(roomCode) {
    console.log("getQuestionForRoom invoked")
    let room = getRoom(roomCode)
    let setting = getSettings(roomCode)

    console.log("SETTINGS @getQuestionForRoom : " + JSON.stringify(setting))

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
        questionBatch = await fetchQuestions(setting.GAMEPLAY.BATCH_SIZE)
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
    room.currentRound.questionStartTime = Date.now()  // for time-based scoring
    setRoom(roomCode, room)

    return currentQuestion
}

async function fetchQuestions(BATCH_SIZE) {
    console.log("fetchQuestions invoked")
    let questionSet = await downloadFile(Constants.FILES.QUESTION.STANDARD)
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

async function getQuestion(context, batchSize, settings, questionSet) {
    console.log("getQuestion invoked")
    try {
        let userData = _.get(context, Constants.STRINGS.USER_DATA)
        let subscriptionDetails = _.get(userData, Constants.STRINGS.SUBSCRIPTION_DETAILS) || {}
        let playerId = _.get(userData, Constants.STRINGS.PLAYER_ID)
        // let [settings, questionSet] = await Promise.all([downloadFile(Constants.FILES.SETTINGS), downloadFile(Constants.FILES.QUESTION.STANDARD)])
        let nextQuestionBatch = _.get(userData, Constants.STRINGS.NEXT_QUESTION_BATCH) || []
        console.log("QUESTION SET LENGTH : " + questionSet.length)
        console.log("nextQuestionBatch @before : " + JSON.stringify(nextQuestionBatch))

        if (_.isEmpty(nextQuestionBatch)) nextQuestionBatch = await fetchFileteredQuestion(context, playerId, batchSize)
        let index = _.random(0, nextQuestionBatch.length - 1)
        console.log("QUESTION INDEX : " + nextQuestionBatch[index])
        let currentQuestion = questionSet[nextQuestionBatch[index]]
        nextQuestionBatch.splice(index, 1)
        console.log("nextQuestionBatch @after : " + JSON.stringify(nextQuestionBatch))
        _.set(userData, Constants.STRINGS.NEXT_QUESTION_BATCH, nextQuestionBatch)

        return currentQuestion

    } catch (err) {
        console.error("Error @getQuestion : ")
        console.error(err)
    }
}

async function fetchFileteredQuestion(context, questionSet, batchSize) {
    console.log("fetchFileteredQuestion invoked")
    let userData = _.get(context, Constants.STRINGS.USER_DATA)
    let playerId = _.get(userData, Constants.STRINGS.PLAYER_ID)
    let questionFragments = await getData(Constants.DB_TABLE.FRAGMENTS, { playerId: playerId })
    console.log("QUESTION FRAGMENTS : " + JSON.stringify(questionFragments))
    let fileteredQuestionSet = _.get(userData, Constants.STRINGS.NEXT_QUESTION_BATCH) || []

    if (_.isEmpty(questionFragments)) {
        questionFragments = {
            playerId: playerId,
            frags: []
        }
    }

    let fragments = questionFragments.frags
    while (fileteredQuestionSet.length < batchSize) {
        if (fragments.length === 0) fragments = [{ start: 0, end: questionSet.length }]
        let fragIndex = _.random(0, fragments.length - 1)
        let currentFragData = fragments[fragIndex]
        let currentQuestionIndex = _.random(currentFragData.start, currentFragData.end)
        fragments.splice(fragIndex, 1)
        if (currentQuestionIndex == currentFragData.start && currentQuestionIndex < currentFragData.end) {
            fragments.push({ start: currentFragData.start + 1, end: currentFragData.end })
        } else if (currentQuestionIndex > currentFragData.start && currentQuestionIndex == currentFragData.end) {
            fragments.push({ start: currentFragData.start, end: currentFragData.end - 1 })
        } else if (currentQuestionIndex > currentFragData.start && currentQuestionIndex < currentFragData.end) {
            fragments.push({ start: currentFragData.start, end: currentQuestionIndex - 1 })
            fragments.push({ start: currentQuestionIndex + 1, end: currentFragData.end })
        }
        fileteredQuestionSet.push(currentQuestionIndex)
    }
    console.log("FILETERED QUESTION SET : " + JSON.stringify(fileteredQuestionSet))
    questionFragments.frags = fragments
    await saveData(Constants.DB_TABLE.FRAGMENTS, questionFragments)
    return fileteredQuestionSet
}

module.exports = { getQuestionForRoom, getQuestion }