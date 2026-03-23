const { io } = require("socket.io-client");

const URL = "http://localhost:5002";

// Client 1 (Host)
const socket1 = io(URL, { transports: ["polling", "websocket"] });
// Client 2 (Player)
const socket2 = io(URL, { transports: ["polling", "websocket"] });

let roomCodeToJoin = null;

socket1.on("connect", () => {
    console.log("Client 1 connected, ID:", socket1.id);
    socket1.emit("room:create", { username: "HostUser" });
});

socket1.on("room:created", (data) => {
    console.log("Client 1 created room:", data.roomCode);
    roomCodeToJoin = data.roomCode;
    
    // Now try to join with Client 2
    socket2.emit("room:join", { username: "PlayerUser", roomCode: roomCodeToJoin });
});

socket1.on("error", (err) => console.log("Client 1 error:", err));

socket2.on("connect", () => {
    console.log("Client 2 connected, ID:", socket2.id);
});

socket2.on("room:joined", (data) => {
    console.log("Client 2 joined room!", data);
    process.exit(0);
});

socket2.on("error", (err) => {
    console.log("Client 2 error:", err);
    process.exit(1);
});

setTimeout(() => {
    console.log("Timeout reached. Exiting.");
    process.exit(1);
}, 3000);
