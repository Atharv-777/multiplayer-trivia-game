const { saveData } = require("../common/DBUtil");
const { Constants } = require("../Constants");

async function userRegistrationHandler(req, res, context) {
    try {
        let request = req.body
        let playerData = request.playerData || request;
        console.log("PLAYER DATA before saving : " + JSON.stringify(playerData))
        const data = await saveData(Constants.DB_TABLE.USER_DATA, playerData)
        console.log("Successfully saved data to DB : " + JSON.stringify(data))

        return res.status(200).json({ success: true, playerData: playerData });

    } catch (err) {
        console.error("Error @userRegistrationHandler : ")
        console.error(err)
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
}

module.exports = { userRegistrationHandler }