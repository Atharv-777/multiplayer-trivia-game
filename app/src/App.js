import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import WaitingRoom from "./pages/WaitingRoom";
import "./App.css";
import GamePage from "./pages/GamePage";
import GameEndScreen from "./pages/GameEndScreen";
import InstructionPage from "./pages/InstructionPage";
import { JestProvider } from "./context/JestContext";

function App() {
  return (
    <JestProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/instructions" element={<InstructionPage />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/waiting" element={<WaitingRoom />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/game-end" element={<GameEndScreen />} />
        </Routes>
      </HashRouter>
    // </JestProvider>
  );
}

export default App;
