import React, { useEffect, useRef } from "react";
import "./LiveTranscript.css";

export default function LiveTranscript({ transcripts = [] }) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts]);

  if (transcripts.length === 0) return null;

  // Show only last 8 entries for readability
  const visible = transcripts.slice(-8);

  return (
    <div className="live-transcript" ref={containerRef} id="live-transcript">
      <div className="live-transcript__inner">
        {visible.map((entry, idx) => (
          <div
            key={idx}
            className={`live-transcript__entry live-transcript__entry--${entry.role}`}
          >
            <span className="live-transcript__role">
              {entry.role === "user" ? "You" : "AI"}
            </span>
            <span className="live-transcript__text">{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
