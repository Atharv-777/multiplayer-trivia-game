const jwt = require("jsonwebtoken");
const _ = require("lodash");
require("dotenv").config()
const { getData } = require("./DBUtil");
const { Constants } = require("../Constants");

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, "base64");

function authenticate(req) {
    console.log("authenticate invoked")
    try {
        const playerSignedToken = req.headers?.authorization
        let request = req.body
        let playerData = request.playerData

        if (!playerSignedToken || playerSignedToken === "") {
            return {
                valid: false,
                error: "Missing auth token"
            }
        }

        const decoded = jwt.verify(playerSignedToken, JWT_SECRET, { algorithms: ["HS256"] });
        const verifiedPlayerData = decoded.player
        return {
            valid: true,
            playerData: verifiedPlayerData
        }
    } catch (err) {
        console.error("Invalid auth token: ")
        console.error(err)
        return {
            valid: false,
            error: "Invalid auth token."
        }
    }
}

async function getContext(playerId) {
    console.log("getContext invoked")
    try {
        let context = {
            userData: {}
        }
        let userData = await getData(Constants.DB_TABLE.USER_DATA, { playerId: playerId }) || {}
        if (_.isEmpty(userData)) userData = { playerId: playerId }
        context.userData = userData
        return context
    } catch (err) {
        console.error("Error @getContext : ")
        console.error(err)
    }
}
module.exports = { authenticate, getContext }