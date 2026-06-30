const { Constants } = require("../Constants")
const _ = require("lodash")

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

module.exports = { checkAnswer, addScore }