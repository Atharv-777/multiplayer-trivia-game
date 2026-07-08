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
            success: true,
            data: {
                playerData
            }
        }

        return res.status(200).json(response);

    } catch (err) {
        console.error("Error @userRegistrationHandler : ")
        console.error(err)

        return res.status(500).json({ success: false, error: "Internal server error" });
    }
}

async function updatePlayerSubscriptionDetails(req, res, context) {
    console.info("updatePlayerSubscritpionDetails invoked")
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

        return res.status(200).json({ success: true, message: "Successfully saved subscription details." })
    } catch (err) {
        console.error("Error @updatePlayerSubscriptionDetails : ")
        console.error(err)
        return res.status(500).json({ success: false, message: "Internal server error" })
    }
}

module.exports = { userRegistrationHandler, updatePlayerSubscriptionDetails }