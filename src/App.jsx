import React, { useEffect, useState } from "react";
import VoiceSession from "./components/VoiceSession.jsx";
import "./App.css";
import Admin from "./components/Admin.jsx";

export default function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="app" id="app-root">
      {/* <VoiceSession /> */}
      {route === "#admin" ? <Admin /> : <VoiceSession />}
      <footer className="app__footer">
        <span>
          Powered by <strong>IOTFIY</strong> & <strong>NUCLEUS</strong>&middot;
          &copy; {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}
