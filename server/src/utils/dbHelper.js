const { createClient } = require("@supabase/supabase-js")
const _ = require("lodash")
require("dotenv").config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fetchQuestions(BATCH_SIZE) {
    console.log("fetchQuestions invoked")
    let { count, error: countError } = await supabaseClient.from("trivia_questions").select("*", { count: "exact", head: true })
    if (countError) {
        console.error("Error fetching questions:", error)
        return []
    }
    let randomIds = []

    while (randomIds.length < BATCH_SIZE) {
        const id = _.random(1, count)
        if (!randomIds.includes(id)) randomIds.push(id)
    }

    console.log("RANDOM IDS @fetchQuestions : " + JSON.stringify(randomIds))

    const { data, error } = await supabaseClient.from("trivia_questions").select("*").in("id", randomIds)
    console.log("QUESTION BATCH @fetchQuestions : " + JSON.stringify(data))
    if (error) {
        console.error("Error fetching questions: ", error)
        return []
    }

    return data
}
module.exports = { fetchQuestions }