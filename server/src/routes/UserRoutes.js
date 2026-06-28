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
const { saveData } = require("../utils/dbHelper")
const fs = require("fs")
const _ = require("lodash")

const router = express.Router();
const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, "base64");

/**
 * POST /api/verify-player
 * Body: { playerSigned: string }
 * Response: { valid: true, playerId: string } | { valid: false, error: string }
 */
router.post("/verify-player", async (req, res) => {
    const { playerSigned } = req.body;

    if (!playerSigned) {
        return res.status(400).json({ valid: false, error: "Missing playerSigned token" });
    }

    // In local/dev mode the client sends an empty string — skip verification
    if (playerSigned === "") {
        console.warn("[verifyPlayer] Empty playerSigned — local dev mode, skipping verification");
        return res.json({ valid: true, playerId: "local_dev", devMode: true });
    }

    try {
        // Verify the JWT — jest signs with HS256
        const decoded = jwt.verify(playerSigned, JWT_SECRET, { algorithms: ["HS256"] });
        const playerId = decoded.player?.playerId || decoded.sub;

        return res.json({ valid: true, playerId });
    } catch (err) {
        console.error("[verifyPlayer] JWT verification failed:", err.message);
        return res.status(401).json({ valid: false, error: "Invalid or expired player token" });
    }
});

router.post("/register-user", async (req, res) => {
    try {
        // console.log("REQUEST BODY : ", req)
        console.log(_.keys(req))
        console.log("RAW HEADERS : " + JSON.stringify(req.headers))
        const playerSignedToken = req.headers?.authorization
        let playerData = req.body
        if (!playerSignedToken || playerSignedToken === "") {
            return res.status(400).json({ valid: false, error: "Missing playerSigned token" });
        }

        const decoded = jwt.verify(playerSignedToken, JWT_SECRET, { algorithms: ["HS256"] });
        const verifiedPlayerData = decoded.player
        if (playerData.playerId != verifiedPlayerData.playerId) {
            return res.status(400).json({
                valid: false,
                error: "Invalid request. Player ID mismatch."
            })
        }

        // DATABASE call to save user data
        playerData["PLAYER_ID"] = playerData.playerId
        playerData = _.omit(playerData, ["playerId"])
        console.log("PLAYER DATA before saving : " + JSON.stringify(playerData))
        const data = await saveData("multi-trivia-user-data", playerData)
        console.log("Successfully saved data to DB : " + JSON.stringify(data))

        return res.json({ valid: true, playerData: playerData });

    } catch (err) {
        console.error("Error while registering user.")
        console.error(err)
    }
})
module.exports = router;
