import React from "react";
import VoiceSession from "./components/VoiceSession.jsx";
import "./App.css";

export default function App() {
  return (
    <div className="app" id="app-root">
      <VoiceSession />
      <footer className="app__footer">
        <span>
          Powered by <strong>IOTFIY</strong> & <strong>NUCLEUS</strong>&middot;
          &copy; {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}
