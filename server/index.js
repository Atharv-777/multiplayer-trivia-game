const express = require("express")
const { createServer } = require("node:http")
const { Server } = require("socket.io")
const cors = require("cors")
require("dotenv").config()

const { registerSocketHandler } = require("./src/socket")
const router = require("./src/routes/Router")

const PORT = process.env.SERVER_PORT
const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: { origin: "*" }
})

registerSocketHandler(io)

// CORS — allow requests from the React dev server
app.use(cors({ origin: "*" }))

// Body parser — needed for POST /api/verify-player
app.use(express.json())


// REST API routes
app.use("/api", router)

app.get("/", (req, res) => {
    console.log("REQ")
    console.log(req)
    res.send({ status: "OK" })
})

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at port : ${PORT}`)
})