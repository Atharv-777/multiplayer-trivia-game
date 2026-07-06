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

async function getContext(playerData, type, roomId = "") {
    console.log("getContext invoked")
    try {
        let context = {
            userData: {},
            roomData: {}
        }
        let userData = await getData(Constants.DB_TABLE.USER_DATA, { playerId: playerData.playerId }) || {}
        if (_.isEmpty(userData)) userData = playerData
        context.userData = userData
        return context
    } catch (err) {
        console.error("Error @getContext : ")
        console.error(err)
    }
}
/**
 * authenticateSocket — verifies JWT from socket event data payload.
 * Reads token from data.playerSigned (instead of req.headers.authorization).
 * Supports dev-mode bypasses for "" and "mock-signed-player-jwt-token".
 */
function authenticateSocket(data) {
    console.log("authenticateSocket invoked")
    try {
        const playerSignedToken = data?.playerSigned
        const playerData = data?.playerData

        // Dev-mode bypass: empty token (standalone local dev, no Jest SDK)
        if (playerSignedToken === "" || playerSignedToken === undefined) {
            console.warn("[authenticateSocket] Empty/missing playerSigned — local dev mode")
            return {
                valid: true,
                playerData: playerData || { playerId: `local_dev_${Date.now()}`, username: data?.username }
            }
        }

        // Dev-mode bypass: Jest sandbox mock token
        if (playerSignedToken === "mock-signed-player-jwt-token") {
            console.warn("[authenticateSocket] Mock token — Jest sandbox mode")
            return {
                valid: true,
                playerData: playerData || { playerId: `sandbox_${Date.now()}`, username: data?.username }
            }
        }

        const decoded = jwt.verify(playerSignedToken, JWT_SECRET, { algorithms: ["HS256"] });
        const verifiedPlayerData = decoded.player
        return {
            valid: true,
            playerData: verifiedPlayerData
        }
    } catch (err) {
        console.error("Invalid socket auth token: ")
        console.error(err)
        return {
            valid: false,
            error: "Invalid auth token."
        }
    }
}

module.exports = { authenticate, getContext, authenticateSocket }