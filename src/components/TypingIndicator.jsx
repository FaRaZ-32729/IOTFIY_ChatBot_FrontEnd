import React from "react";
import "./TypingIndicator.css";

export default function TypingIndicator() {
  return (
    <div className="typing-indicator" id="typing-indicator">
      <div className="typing-indicator__avatar">
        <svg width="18" height="18" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="8" fill="url(#tg)" />
          <circle cx="32" cy="18" r="3" fill="#00d4ff" />
          <circle cx="44" cy="38" r="3" fill="#7c3aed" />
          <circle cx="20" cy="38" r="3" fill="#6366f1" />
          <defs>
            <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="typing-indicator__dots">
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
      </div>
      <span className="typing-indicator__label">IoTFIY Chatbot is thinking…</span>
    </div>
  );
}
