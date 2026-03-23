const express = require("express")
const { createServer } = require("node:http")
const { Server } = require("socket.io")
require("dotenv").config()

const { registerSocketHandler } = require("./src/socket")

const PORT = process.env.SERVER_PORT
const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: { origin: "*" }
})

registerSocketHandler(io)

app.get("/", (req, res) => {
    res.send({status : "OK"})
})

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at port : ${PORT}`)
})