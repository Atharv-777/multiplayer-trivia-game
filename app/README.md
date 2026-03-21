# Multi Trivia — React Client App

A React-based client for the Multi Trivia WebSocket game. Connects to the Socket.IO server to manage multiplayer game rooms.

## Tech Stack

- **React** (Create React App)
- **React Router DOM** — client-side routing
- **Socket.IO Client** — WebSocket communication with the game server

## Project Structure

```
app/src/
├── socket.js              # Socket.IO client singleton
├── App.js                 # React Router configuration
├── App.css                # Global styles (dark glassmorphism theme)
├── index.js               # Entry point
├── index.css              # Base reset styles
└── pages/
    ├── Home.js            # Landing page — username + Create/Join buttons
    ├── CreateRoom.js      # Room creator — room code display + Start Game
    ├── JoinRoom.js        # Join form — room code input + Join button
    └── WaitingRoom.js     # Joined player view — waiting for host to start
```

## Pages & Routes

| Route | Component | Description |
|---|---|---|
| `/` | `Home` | Username input with **Create Room** and **Join Room** buttons. Buttons stay disabled until a username is entered. |
| `/create` | `CreateRoom` | Emits `room:create` to the server. Displays the generated **room code in large font**, a live player list, and a **Start Game** button (host only). |
| `/join` | `JoinRoom` | Text input for entering a room code. **Join** button is disabled until a code is typed. On success, redirects to the waiting room. |
| `/waiting` | `WaitingRoom` | Displayed to players who joined via code. Shows room code, player list, and a waiting indicator. **No Start Game button** — only the host (on `/create`) can start. |

## Socket Events Used

### Client → Server

| Event | Payload | Triggered From |
|---|---|---|
| `room:create` | `{ username }` | `CreateRoom` on mount |
| `room:join` | `{ username, roomCode }` | `JoinRoom` on Join click |
| `game:start` | `{ roomCode }` | `CreateRoom` on Start Game click |

### Server → Client

| Event | Payload | Handled In |
|---|---|---|
| `connected` | `{ message, socketId }` | (auto) |
| `room:created` | `{ roomCode, message }` | `CreateRoom` |
| `room:joined` | `{ roomCode, players }` | `JoinRoom` → navigates to `WaitingRoom` |
| `room:player_joined` | `{ username, players }` | `CreateRoom`, `WaitingRoom` |
| `error` | `{ message }` | `CreateRoom`, `JoinRoom` |

## How to Run

```bash
# 1. Start the Socket.IO server (default port 3000)
cd server && node index.js

# 2. Start the React app (port 3001 to avoid conflict)
cd app && PORT=3001 npm start
```

### Testing from Other Devices

The dev server prints a network URL (e.g. `http://192.168.x.x:3001`). Open this on any device connected to the same WiFi to test multiplayer.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the React dev server (set via env) |
| `REACT_APP_SERVER_URL` | `http://localhost:3000` | Socket.IO server URL (set in `.env` or env) |

## Design

- Dark theme with glassmorphism cards
- Gradient accent colors (indigo → emerald)
- Smooth entry animations and micro-interactions
- Responsive layout (works on mobile)
- Inter font from Google Fonts
