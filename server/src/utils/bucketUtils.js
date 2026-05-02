const admin = require("firebase-admin")
const fs = require("fs")

let serviceAccount = require("../../multi-trivia-game-firebase-adminsdk-fbsvc-6ea7632ad7.json")
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'multi-trivia-game.firebasestorage.app' // Found in Storage tab
});

async function downloadFile(filepath) {
    console.log("downloadFile invoked")
    try {
        const bucket = admin.storage().bucket()
        const file = bucket.file(filepath)
        const [response] = await file.download()
        const content = JSON.parse(response.toString())

        return content
    } catch (err) {
        console.log("Error @downloadFile: " + JSON.stringify(err))
    }
}

module.exports = { downloadFile }