// const admin = require("firebase-admin")
const fs = require("fs")
const axios = require("axios")

// let serviceAccount = require("../../multi-trivia-game-firebase-adminsdk-fbsvc-6ea7632ad7.json")
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     storageBucket: 'multi-trivia-game.firebasestorage.app' // Found in Storage tab
// });

async function downloadFile(filename) {
    console.log("downloadFile invoked")
    try {
        let basePath = process.env.BASE_ADDR
        let path = `${basePath}/${filename}`

        console.log("PATH : " + path)
        let response = await axios.get(path)
        return response.data

        // const bucket = admin.storage().bucket()
        // const file = bucket.file(filepath)
        // const [response] = await file.download()
        // const content = JSON.parse(response.toString())

        // return content
    } catch (err) {
        console.log("Error @downloadFile: ")
        console.error(err)
    }
}

module.exports = { downloadFile }