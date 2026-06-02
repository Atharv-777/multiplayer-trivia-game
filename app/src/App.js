import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import WaitingRoom from "./pages/WaitingRoom";
import "./App.css";
import GamePage from "./pages/GamePage";
import LoginPage from "./pages/LoginPage";
import { JestProvider } from "./context/JestContext";

function App() {
  return (
    <JestProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/waiting" element={<WaitingRoom />} />
          <Route path="/game" element={<GamePage />} />
        </Routes>
      </BrowserRouter>
    </JestProvider>
  );
}

export default App;
