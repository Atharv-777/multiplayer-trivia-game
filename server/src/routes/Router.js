/**
 * verifyPlayer.js — POST /api/verify-player
 *
 * Accepts a Jest-signed JWT from the client (obtained via JestSDK.getPlayerSigned()),
 * verifies the signature using the shared secret, and returns the trusted playerId.
 *
 * Flow:
 *  1. Client calls JestSDK.getPlayerSigned() → { playerSigned: "<JWT>" }
 *  2. Client sends POST /api/verify-player { playerSigned }
 *  3. Server verifies the JWT against the shared JWS_SECRET
 *  4. Server responds { valid: true, playerId } or { valid: false, error }
 */

const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config()
const _ = require("lodash");
const RouteMap = require("./RouteMapper");
const { authenticate, getContext } = require("../common/Middleware");
const { Constants } = require("../Constants");
const { saveData } = require("../common/DBUtil");

const router = express.Router();
/**
 * POST /api/verify-player
 * Body: { playerSigned: string }
 * Response: { valid: true, playerId: string } | { valid: false, error: string }
 *
 * NOTE: This is an explicit route that reads JWT from the request BODY (not header).
 * It is NOT handled by the wildcard routeHandler below.
 */
// router.post("/verify-player", async (req, res) => {
//     const { playerSigned } = req.body;

//     if (!playerSigned) {
//         return res.status(400).json({ valid: false, error: "Missing playerSigned token" });
//     }

//     // In local/dev mode the client sends an empty string — skip verification
//     if (playerSigned === "") {
//         console.warn("[verifyPlayer] Empty playerSigned — local dev mode, skipping verification");
//         return res.json({ valid: true, playerId: "local_dev", devMode: true });
//     }

//     try {
//         // Verify the JWT — jest signs with HS256
//         const decoded = jwt.verify(playerSigned, JWT_SECRET, { algorithms: ["HS256"] });
//         const playerId = decoded.player?.playerId || decoded.sub;

//         return res.json({ valid: true, playerId });
//     } catch (err) {
//         console.error("[verifyPlayer] JWT verification failed:", err.message);
//         return res.status(401).json({ valid: false, error: "Invalid or expired player token" });
//     }
// });

// router.post("/register-user", async (req, res) => {
//     try {
//         // console.log("REQUEST BODY : ", req)
//         console.log(_.keys(req))
//         console.log(req.route.path)
//         // console.log("RAW HEADERS : " + JSON.stringify(req.headers))
//         const playerSignedToken = req.headers?.authorization
//         let playerData = req.body
//         if (!playerSignedToken || playerSignedToken === "") {
//             return res.status(400).json({ valid: false, error: "Missing playerSigned token" });
//         }
//         const decoded = jwt.verify(playerSignedToken, JWT_SECRET, { algorithms: ["HS256"] });
//         const verifiedPlayerData = decoded.player
//         if (playerData.playerId != verifiedPlayerData.playerId) {
//             return res.status(400).json({
//                 valid: false,
//                 error: "Invalid request. Player ID mismatch."
//             })
//         }

//         // DATABASE call to save user data
//         // playerData["PLAYER_ID"] = playerData.playerId
//         // playerData = _.omit(playerData, ["playerId"])
//         console.log("PLAYER DATA before saving : " + JSON.stringify(playerData))
//         const data = await saveData(Constants.DB_TABLE.USER_DATA, playerData)
//         console.log("Successfully saved data to DB : " + JSON.stringify(data))

//         return res.json({ valid: true, playerData: playerData });

//     } catch (err) {
//         console.error("Error while registering user.")
//         console.error(err)
//     }
// })

// router.post("/get-question", async (req, res) => {
//     try {
//         let playerData = req.body
//         let context = await getContext(playerData.playerId)
//         let questionSet = await downloadFile("")

//     } catch (err) {
//         console.error("Error @get-question : ")
//         console.error(err)
//     }
// })

router.post("/*path", routeHandler)

async function routeHandler(req, res) {
    console.log("routeHandler invoked")
    try {
        // console.log(req.path)
        let authResp = authenticate(req)
        if (!authResp.valid) return res.status(401).json({ valid: false, error: authResp.error })
        let playerData = authResp.playerData
        // Guard: check if handler exists for this route
        let context = await getContext(playerData)
        const handler = RouteMap[req.path]
        if (!handler) return res.status(404).json({ error: `Route not found: ${req.path}` })

        let response = await handler(req, res, context)
        let userData = _.get(context, Constants.STRINGS.USER_DATA)
        await saveData(Constants.DB_TABLE.USER_DATA, userData)
        return response

    } catch (err) {
        console.error("Error @routeHandler : ")
        console.error(err)
        return res.status(500).json({ valid: false, error: "Internal server error" })
    }
}

module.exports = router;
