const { createClient } = require("@supabase/supabase-js")
require("dotenv").config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fetchQuestions(BATCH_SIZE) {
    console.log("fetchQuestions invoked")
    const { data, error } = await supabaseClient.from("trivia_questions").select("*").limit(BATCH_SIZE)
    if (error) {
        console.error("Error fetching questions:", error)
        return []
    }
    return data
}
module.exports = { fetchQuestions }