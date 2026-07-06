const { Constants } = require("../Constants");
const { getRoom, setRoom, getSettings } = require("../Store");
// const { fetchQuestions } = require("./dbHelper");
const { downloadFile } = require("./BucketUtils")
const _ = require("lodash");
const { getData, saveData } = require("./DBUtil");
const { getRandomElement } = require("./Common");


async function getQuestionForRoom(roomCode, questionSet) {
    console.log("getQuestionForRoom invoked")
    let room = getRoom(roomCode)
    // let roomData = await getData(Constants.DB_TABLE.ROOM_DATA, { roomId: roomCode })
    let nextQuestionBatch = _.get(room, Constants.STRINGS.NEXT_QUESTION_BATCH)
    let index = _.random(0, nextQuestionBatch.length - 1)
    console.log("QUESTION INDEX : " + nextQuestionBatch[index])
    let currentQuestion = questionSet[nextQuestionBatch[index]]
    nextQuestionBatch.splice(index, 1)

    _.set(currentQuestion, Constants.STRINGS.QUESTION_START_TIME, Date.now())
    _.set(room, Constants.STRINGS.NEXT_QUESTION_BATCH, nextQuestionBatch)
    setRoom(roomCode, room)
    return currentQuestion
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

        if (_.isEmpty(nextQuestionBatch)) nextQuestionBatch = await fetchFileteredQuestion(context, questionSet, batchSize)
        let index = _.random(0, nextQuestionBatch.length - 1)
        console.log("QUESTION INDEX : " + nextQuestionBatch[index])
        let currentQuestion = questionSet[nextQuestionBatch[index]]
        nextQuestionBatch.splice(index, 1)
        console.log("nextQuestionBatch @after : " + JSON.stringify(nextQuestionBatch))
        _.set(userData, Constants.STRINGS.NEXT_QUESTION_BATCH, nextQuestionBatch)
        _.set(currentQuestion, Constants.STRINGS.QUESTION_START_TIME, Date.now())

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
        console.log("QUESTION FRAGS EMPTY")
        questionFragments = {
            playerId: playerId,
            frags: []
        }
    }

    let fragments = questionFragments.frags
    console.log("FRAGMENTS : " + JSON.stringify(fragments))
    while (fileteredQuestionSet.length < batchSize) {
        if (fragments.length === 0) fragments = [{ start: 0, end: questionSet.length - 1 }]
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

module.exports = { getQuestionForRoom, getQuestion, fetchFileteredQuestion }