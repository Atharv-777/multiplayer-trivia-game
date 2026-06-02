/**
 * verifyPlayer.js — POST /api/verify-player
 *
 * Accepts a Jest-signed JWT from the client (obtained via JestSDK.getPlayerSigned()),
 * fetches Jest's public key, verifies the signature, and returns the trusted playerId.
 *
 * Flow:
 *  1. Client calls JestSDK.getPlayerSigned() → { playerSigned: "<JWT>" }
 *  2. Client sends POST /api/verify-player { playerSigned }
 *  3. Server verifies the JWT against Jest's public key
 *  4. Server responds { valid: true, playerId } or { valid: false, error }
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const { save } = require("../utils/dbHelper");
require("dotenv").config()

const router = express.Router();

const JEST_PUBLIC_KEY_URL = "https://cdn.jest.com/sdk/latest/public_key.pem";

// Cache the public key in memory so we only fetch it once per server lifecycle
let cachedPublicKey = null;

async function getJestPublicKey() {
    if (cachedPublicKey) return cachedPublicKey;

    const res = await fetch(JEST_PUBLIC_KEY_URL);
    if (!res.ok) {
        throw new Error(`Failed to fetch Jest public key: ${res.status}`);
    }
    cachedPublicKey = await res.text();
    console.log("[verifyPlayer] Fetched and cached Jest public key");
    return cachedPublicKey;
}

router.post("/register", async (req, res) => {
    const { playerSignedToken, username, country } = req.body

    if (!playerSignedToken || !username || !country)
        return res.status(400).json({ valid: false, error: "Missing required fields" });

    try {
        const publicKey = await getJestPublicKey()
        const decoded = jwt.verify(playerSignedToken, publicKey, { algorithms: ["RS256"] })
        let userData = {
            id: decoded.sub,
            username: username,
            country: country
        }
        const result = await save(process.env.USER_DATA_TABLE, userData, decoded.sub)
        console.log(`Successfully register user : ${result}`)
        res.status(200).json({
            valid: true,
            playerId: decoded.sub
        })

    } catch (err) {
        console.error("Error while registering user")
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
        const publicKey = await getJestPublicKey();

        // Verify the JWT — jest signs with RS256
        const decoded = jwt.verify(playerSigned, publicKey, { algorithms: ["RS256"] });

        return res.json({ valid: true, playerId: decoded.sub || decoded.playerId });
    } catch (err) {
        console.error("[verifyPlayer] JWT verification failed:", err.message);
        return res.status(401).json({ valid: false, error: "Invalid or expired player token" });
    }
});

module.exports = router;
