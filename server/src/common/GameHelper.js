const { Constants } = require("../Constants")
const _ = require("lodash")
const { getTodayDate } = require("./DateHelper")
const RedisUtils = require("./redisUtils")
const { getRoom } = require("../Store")

function checkAnswerAndCalculatePoints(lastQuestion, answer, settings) {
    console.info("checkAnswerAndCalculatePoints invoked")
    const ROUND_TIME_MS = (settings.GAMEPLAY.ROUND_TIME_IN_SECONDS || 15) * 1000
    const MAX_POINTS = settings.GAMEPLAY.MAX_POINTS_PER_QUESTION || 10
    const MIN_SCORE_FACTOR = settings.GAMEPLAY.MIN_SCORE_FACTOR || 0.5
    let pointsEarned = 0

    let isAnswerCorrect = false
    console.log("LAST QUESTION : ", lastQuestion)
    console.log("ANSWER : ", answer)
    if (_.toLower(lastQuestion.answer) == _.toLower(answer)) isAnswerCorrect = true

    if (isAnswerCorrect) {
        const questionStartTime = _.get(lastQuestion, Constants.STRINGS.QUESTION_START_TIME)
        const timeElapsed = Date.now() - questionStartTime
        const timeFraction = Math.max(0, 1 - timeElapsed / ROUND_TIME_MS)
        pointsEarned = Math.round(MAX_POINTS * (MIN_SCORE_FACTOR + (1 - MIN_SCORE_FACTOR) * timeFraction))
    }

    return { isAnswerCorrect, pointsEarned }
}

async function addScore(context, pointsEarned) {
    console.info("addScore invoked")
    let userData = _.get(context, Constants.STRINGS.USER_DATA)
    let roundData = _.get(userData, Constants.STRINGS.ROUND_DATA)
    // let username = _.get(userData, "username") || _.get(userData, Constants.STRINGS.PLAYER_ID)
    let playerId = _.get(userData, Constants.STRINGS.PLAYER_ID)
    let leaderboardKey = getLeaderboardKey(context, "SINGLE_PLAYER")

    console.log(`addScore — key: ${leaderboardKey}, playerId: ${playerId}, points: ${pointsEarned}`)

    let redisUtils = new RedisUtils()
    roundData.currentRoundScore += pointsEarned
    _.set(userData, Constants.STRINGS.ROUND_DATA, roundData)
    await redisUtils.incrementScore(leaderboardKey, playerId, pointsEarned)
}

function initializeRoundData(context, settings) {
    let userData = _.get(context, Constants.STRINGS.USER_DATA)
    let subscriptionDetails = _.get(userData, Constants.STRINGS.SUBSCRIPTION_DETAILS) || {}
    let roundData = {
        currentRound: 1,
        totalRounds: (subscriptionDetails.status == "active") ? settings.GAMEPLAY.SUBSCRIBER.SINGLE_PLAYER_ROUND : settings.GAMEPLAY.NON_SUBSCRIBER.SINGLE_PLAYER_ROUND,
        currentRoundScore: 0,
        currentQuestion: 1,
        totalQuestionsPerRound: settings.GAMEPLAY.SINGLE_PLAYER_QUESTION_COUNT,
        multiplayerRound: (subscriptionDetails.status == "active") ? settings.GAMEPLAY.SUBSCRIBER.MULTIPLAYER_ROUND : settings.GAMEPLAY.NON_SUBSCRIBER.MULTIPLAYER_ROUND
    }

    _.set(userData, Constants.STRINGS.ROUND_DATA, roundData)
    return roundData
}

function updateRoundData(context) {
    console.info("updateRoundData invoked")
    let userData = _.get(context, Constants.STRINGS.USER_DATA)
    let subscriptionDetails = _.get(userData, Constants.STRINGS.SUBSCRIPTION_DETAILS) || {}
    let roundData = _.get(userData, Constants.STRINGS.ROUND_DATA) || {}
    let lastPlayedDate = _.get(userData, Constants.STRINGS.LAST_PLAYED_DATE)
    let todaysDate = getTodayDate()
    console.log("ROUND DATA before: " + JSON.stringify(roundData))

    if (roundData.currentQuestion > roundData.totalQuestionsPerRound) {
        roundData.currentRound += 1
        roundData.currentQuestion = 0
        roundData.currentRoundScore = 0
    }
    roundData.currentQuestion += 1
    console.log("ROUND DATA after: " + JSON.stringify(roundData))

    return roundData
}

function initializeRoomRoundData(settings) {
    console.info("initializeRoomRoundData invoked")

    let roundData = {
        currentQuestion: 1,
        totalQuestionsPerRound: settings.GAMEPLAY.MULTIPLAYER_QUESTION_COUNT
    }

    // _.set(room, Constants.STRINGS.ROUND_DATA, roundData)
    return roundData
}

function updateMultiplayerRoundData(context) {
    console.info("updateMultiplayerRoundData invoked")

    let userData = _.get(context, Constants.STRINGS.USER_DATA)
    let subscriptionDetails = _.get(userData, Constants.STRINGS.SUBSCRIPTION_DETAILS)
    let roundData = _.get(userData, Constants.STRINGS.ROUND_DATA)

}

function getLeaderboardKey(context, type, roomCode) {
    let userData = _.get(context, Constants.STRINGS.USER_DATA)
    let country = _.get(userData, Constants.STRINGS.COUNTRY)
    roomCode = roomCode || ""

    switch (type) {
        case "SINGLE_PLAYER":
            let todaysDate = getTodayDate()
            return `LEADERBOARD:${country}:SINGLE_PLAYER:${todaysDate}`
            break
        case "MULTIPLAYER":
            if (!roomCode)
                return "ERROR : No Room Code Provided"
            return `LEADERBOARD:${country}:MULTIPLAYER:${roomCode}`
            break
        default:
            console.error("No case match for type : " + type)
            break
    }

}

module.exports = { checkAnswerAndCalculatePoints, addScore, initializeRoundData, updateRoundData, initializeRoomRoundData, updateMultiplayerRoundData, getLeaderboardKey }