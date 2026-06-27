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
const { save } = require("../utils/dbHelper");
require("dotenv").config()

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;


router.post("/register", async (req, res) => {
    const { playerSignedToken, username, country } = req.body

    console.log(`USERNAME : ${username}, COUNTRY : ${country}`)
    if (!username || !country)
        return res.status(400).json({ valid: false, error: "Missing required fields" });

    // In local/dev mode the client sends an empty string — skip JWT verification
    if (!playerSignedToken || playerSignedToken === "") {
        console.warn("[register] Empty playerSignedToken — local dev mode, skipping verification");
        const devPlayerId = `local_dev_${Date.now()}`;
        return res.status(200).json({
            valid: true,
            playerId: devPlayerId,
            appName: "multi-trivia-games",
            devMode: true
        });
    }

    // Jest sandbox/emulator sends this mock token — skip verification
    if (playerSignedToken === "mock-signed-player-jwt-token") {
        console.warn("[register] Mock sandbox token — skipping verification");
        const mockPlayerId = `sandbox_${Date.now()}`;
        return res.status(200).json({
            valid: true,
            playerId: mockPlayerId,
            devMode: true
        });
    }

    try {
        // Jest provides the JWS secret as base64 — decode it for HS256 verification
        const secret = Buffer.from(JWT_SECRET, 'base64');
        const decoded = jwt.verify(playerSignedToken, secret, { algorithms: ["HS256"] })
        const playerId = decoded.player?.playerId || decoded.sub;
        let userData = {
            id: playerId,
            username: username,
            country: country
        }
        // const result = await save(process.env.USER_DATA_TABLE, userData, playerId)
        console.log(`Successfully registered user: ${playerId}`)
        res.status(200).json({
            valid: true,
            playerId: playerId
        })

    } catch (err) {
        console.error("Error while registering user")
        console.error("JWT Error:", err.message)
        console.error("Token (first 50 chars):", playerSignedToken?.substring(0, 50))
        return res.status(500).json({ valid: false, error: "Internal server error" });
    }
})

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

module.exports = router;
