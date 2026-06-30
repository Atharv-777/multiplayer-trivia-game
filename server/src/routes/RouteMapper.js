const { startGameHandler, submitAnswerHandler } = require("../handlers/GameHandler");
const { userRegistrationHandler } = require("../handlers/UserHandler");

const RouteMap = {
    "/user/register-user": userRegistrationHandler,
    // "/get-question": questionHandler,
    "/game/start-game": startGameHandler,
    "/game/submit-answer": submitAnswerHandler,
}

module.exports = RouteMap