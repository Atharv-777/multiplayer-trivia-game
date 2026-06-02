const _ = require("lodash")
const fs = require("fs")
const path = require("path")
const admin = require("firebase-admin")
require("dotenv").config()


const serviceAccount = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../multi-trivia-game-firebase-adminsdk-fbsvc-6ea7632ad7.json"))
)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    })
}
const firestore = admin.firestore()

async function save(tableName, data, id) {
    try {
        const docObj = firestore.collection(tableName).doc(id)
        await docObj.set(data)

        return {
            success: true,
            data
        }
    } catch (err) {
        console.err(`Error while saving data to table ${tableName}`)
        return {
            success: false,
            data: {}
        }
    }
}

async function get(tableName, id) {
    try {
        const docObj = firestore.collection(tableName).doc(id)
        const data = await docObj.get()

        return {
            success: true,
            data
        }
    } catch (err) {
        console.error(`Error while reading data from table: ${tableName} and id: ${id}`)
        return {
            success: false,
            data: {}
        }
    }
}

async function deleteRecord(tableName, id) {
    try {
        const docObj = firestore.collection(tableName).doc(id)
        await docObj.delete()
        return {
            success: true,
            data: { id }
        }
    } catch (err) {
        console.error(`Error while deleting record from table: $    {tableName} and id: ${id}`)
        return {
            success: false,
            data: {}
        }
    }
}


module.exports = { save, get, deleteRecord }