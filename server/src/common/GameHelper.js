const { Constants } = require("../Constants")
const _ = require("lodash")
const { getTodayDate } = require("./DateHelper")

function checkAnswer(context, answer) {
    console.info("checkAnswer invoked")
    let userData = _.get(context, Constants.STRINGS.USER_DATA)
    let lastQuestion = _.get(userData, Constants.STRINGS.LAST_QUESTION)
    console.log("LAST QUESTION : ", lastQuestion)
    console.log("ANSWER : ", answer)
    if (_.toLower(lastQuestion.answer) == _.toLower(answer)) return true
    return false
}

function addScore(context) {
    console.info("addScore invoked")
    let userData = _.get(context, Constants.STRINGS.USER_DATA)
}

function initializeRoundData(context, settings) {
    let userData = _.get(context, Constants.STRINGS.USER_DATA)
    let subscriptionDetails = _.get(userData, Constants.STRINGS.SUBSCRIPTION_DETAILS) || {}
    let roundData = {
        currentRound: 1,
        totalRounds: (subscriptionDetails.status == "active") ? settings.GAMEPLAY.SUBSCRIBER.SINGLE_PLAYER_ROUND : settings.GAMEPLAY.NON_SUBSCRIBER.SINGLE_PLAYER_ROUND,
        currentQuestion: 1,
        totalQuestionsPerRound: settings.GAMEPLAY.SINGLE_PLAYER_QUESTION_COUNT,
        multiplayerRound: (subscriptionDetails.status == "active") ? settings.GAMEPLAY.SUBSCRIBER.MULTIPLAYER_ROUND : settings.GAMEPLAY.NON_SUBSCRIBER.MULTIPLAYER_ROUND
    }

    _.set(userData, Constants.STRINGS.ROUND_DATA, roundData)
    return roundData
}

function updateRoundData(context, settings) {
    console.info("checkRound invoked")
    let userData = _.get(context, Constants.STRINGS.USER_DATA)
    let subscriptionDetails = _.get(userData, Constants.STRINGS.SUBSCRIPTION_DETAILS) || {}
    let roundData = _.get(userData, Constants.STRINGS.ROUND_DATA) || {}
    let lastPlayedDate = _.get(userData, Constants.STRINGS.LAST_PLAYED_DATE)
    let todaysDate = getTodayDate()

    roundData.currentQuestion += 1
    if (roundData.currentQuestion > roundData.totalQuestionsPerRound) {
        roundData.currentRound += 1
        roundData.currentQuestion = 1
    }

    return roundData
}

module.exports = { checkAnswer, addScore, initializeRoundData, updateRoundData }