import { io } from "socket.io-client";

const SERVER_URL =
  process.env.REACT_APP_SERVER_URL ||
  `http://${window.location.hostname}:5002`;

const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ["polling", "websocket"],
  extraHeaders: {
    "ngrok-skip-browser-warning": "true",
  },
});

export default socket;
