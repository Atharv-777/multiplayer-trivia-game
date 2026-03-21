import { io } from "socket.io-client";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:5002";

const socket = io(SERVER_URL, {
  autoConnect: false,
});

export default socket;
