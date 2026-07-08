const { startGameHandler, submitAnswerHandler } = require("../handlers/GameHandler");
const { userRegistrationHandler, updatePlayerSubscriptionDetails } = require("../handlers/UserHandler");

const RouteMap = {
    "/user/register-user": userRegistrationHandler,
    "/user/update-subscription": updatePlayerSubscriptionDetails,
    // "/get-question": questionHandler,
    "/game/start-game": startGameHandler,
    "/game/submit-answer": submitAnswerHandler,
}

module.exports = RouteMap