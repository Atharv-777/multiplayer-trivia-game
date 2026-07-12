const { response } = require("express");
const { downloadFile } = require("../common/BucketUtils");
const { saveData } = require("../common/DBUtil");
const { updateRoundDataForSubscriber } = require("../common/GameHelper");
const { Constants } = require("../Constants");
const _ = require("lodash")

async function userRegistrationHandler(req, res, context) {
    console.info("userRegistrationHandler invoked")
    let response = {}
    try {
        let request = req.body
        let userData = _.get(context, Constants.STRINGS.USER_DATA)
        let playerData = request.playerData || request;
        console.log("PLAYER DATA before saving : " + JSON.stringify(userData))
        userData = { ...userData, ...playerData }
        _.set(userData, Constants.STRINGS.COUNTRY, "US")
        _.set(context, Constants.STRINGS.USER_DATA, userData)
        console.log("Successfully saved data to DB : " + JSON.stringify(userData))
        response = {
            status: 200,
            success: true,
            data: {
                playerData
            }
        }

        return response

    } catch (err) {
        console.error("Error @userRegistrationHandler : ")
        console.error(err)
        response = {
            status: 500,
            success: false,
            error: "Internal server error"
        }
        return response
    }
}

async function updatePlayerSubscriptionDetails(req, res, context) {
    console.info("updatePlayerSubscritpionDetails invoked")
    let response = {}
    try {
        let settings = await downloadFile(Constants.FILES.SETTINGS)
        let request = req.body
        let userData = _.get(context, Constants.STRINGS.USER_DATA)
        let subscriptionDetails = request.subscriptionDetails
        subscriptionDetails = _.pick(subscriptionDetails, ["billingPeriod", "displayDescription", "displayName", "sku", "status"])
        console.log("SUBSCRIPTION DETAILS : ")
        console.log(subscriptionDetails)
        updateRoundDataForSubscriber(context, settings)

        _.set(userData, Constants.STRINGS.SUBSCRIPTION_DETAILS, subscriptionDetails)
        console.log("Successfully updated subscription details")
        response = {
            status: 200,
            success: true,
            message: "Successfully saved subscription details."
        }

        return response
    } catch (err) {
        console.error("Error @updatePlayerSubscriptionDetails : ")
        console.error(err)
        response = {
            status: 500,
            success: false,
            message: "Internal server error"
        }
        return response
    }
}

module.exports = { userRegistrationHandler, updatePlayerSubscriptionDetails }