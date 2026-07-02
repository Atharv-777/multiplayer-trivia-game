const Constants = {
    STRINGS: {
        USER_DATA: "userData",
        PLAYER_ID: "playerId",
        NEXT_QUESTION_BATCH: "nextQuestionBatch",
        LAST_QUESTION: "lastQuestion",
        SUBSCRIPTION_DETAILS: "subscriptionDetails",
        ROUND_DATA: "roundData",
        LAST_PLAYED_DATE: "lastPlayedDate",
        SESSION_COUNT: "sessionCount"
    },
    FILES: {
        QUESTION: {
            STANDARD: "questions/standard.json",
        },
        SETTINGS: "settings.json",
        RESOURCE: "resource.json"
    },
    DB_TABLE: {
        USER_DATA: "multi-trivia-user-data",
        FRAGMENTS: "multi-trivia-question-fragments"
    }
}

module.exports = { Constants }