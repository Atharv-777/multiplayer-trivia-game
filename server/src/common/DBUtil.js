const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const _ = require("lodash")

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
})
const translateConfig = {
    marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: false,
        convertClassInstanceToMap: true
    }
}
const docClient = DynamoDBDocumentClient.from(client, translateConfig)

async function getData(tableName, key) {
    try {
        const command = new GetCommand({
            TableName: tableName,
            Key: key
        })

        const response = await docClient.send(command)
        return response.Item || {}
    } catch (err) {
        console.error("Error while fetching data : ")
        console.error(err)
    }
}

async function saveData(tableName, data) {
    try {
        if (!_.has(data, "createdAt")) _.set(data, "createdAt", new Date().toISOString())
        _.set(data, "updatedAt", new Date().toISOString())

        const command = new PutCommand({
            TableName: tableName,
            Item: data
        })

        const response = await docClient.send(command)
        return response

    } catch (err) {
        console.error("Error while saving data : ")
        console.error(err)
    }
}

module.exports = { getData, saveData }