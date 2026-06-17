import React from "react";
import "./VoiceVisualizer.css";

export default function VoiceVisualizer({ mode = "idle", level = 0 }) {
  const scale = 1 + Math.min(level * 2.5, 0.6);
  const speaking = mode === "speaking";
  const listening = mode === "listening";

  return (
    <div
      className={`voice-viz ${speaking ? "voice-viz--speaking" : ""} ${
        listening ? "voice-viz--listening" : ""
      }`}
      style={{ "--pulse-scale": scale }}
      aria-hidden
    >
      <div className="voice-viz__ring voice-viz__ring--1" />
      <div className="voice-viz__ring voice-viz__ring--2" />
      <div className="voice-viz__core">
        <span className="voice-viz__label">
          {speaking ? "Speaking" : listening ? "Listening" : "Tap to talk"}
        </span>
      </div>
    </div>
  );
}
