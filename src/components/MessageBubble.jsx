import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { IoPersonCircleOutline } from "react-icons/io5";
import AudioPlayer from "./AudioPlayer.jsx";
import { containsUrduScript, formatTime } from "../utils/helpers.js";
import "./MessageBubble.css";

function MarkdownImage({ alt, src, ...props }) {
  const [failed, setFailed] = useState(false);

  if (!src) return null;

  return (
    <div className="msg__image-wrap">
      {!failed && (
        <img
          src={src}
          alt={alt || "Generated image"}
          className="msg__image"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          {...props}
        />
      )}
      {alt && <span className="msg__image-caption">{alt}</span>}
      {failed && (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="msg__image-fallback"
        >
          Open generated image
        </a>
      )}
    </div>
  );
}

/**
 * MessageBubble
 *
 * Props:
 *   role       — "user" | "assistant"
 *   content    — markdown text
 *   audioUrl   — (optional) TTS playback URL
 *   timestamp  — Date or ISO string
 *   transcription — (optional) whisper transcription text
 */
export default function MessageBubble({
  role,
  content,
  audioUrl,
  timestamp,
  transcription,
}) {
  const isUser = role === "user";
  const hasUrdu = useMemo(() => containsUrduScript(content), [content]);

  /* Custom renderers for react-markdown */
  const markdownComponents = useMemo(
    () => ({
      img: ({ node, alt, src, ...props }) => (
        <MarkdownImage alt={alt} src={src} {...props} />
      ),
      p: ({ children }) => {
        const text = typeof children === "string" ? children : "";
        const isUrduBlock = containsUrduScript(text);
        return (
          <p className={isUrduBlock ? "urdu-text" : ""}>{children}</p>
        );
      },
      code: ({ node, inline, children, ...props }) => {
        if (inline) {
          return (
            <code className="msg__inline-code" {...props}>
              {children}
            </code>
          );
        }
        return (
          <pre className="msg__code-block">
            <code {...props}>{children}</code>
          </pre>
        );
      },
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="msg__link">
          {children}
        </a>
      ),
    }),
    []
  );

  return (
    <div
      className={`msg ${isUser ? "msg--user" : "msg--bot"}`}
      id={`message-${timestamp}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="msg__avatar msg__avatar--bot">
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="8" fill="url(#mg)" />
            <circle cx="32" cy="18" r="3" fill="#00d4ff" />
            <circle cx="44" cy="38" r="3" fill="#7c3aed" />
            <circle cx="20" cy="38" r="3" fill="#6366f1" />
            <defs>
              <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      <div className="msg__body">
        {/* Whisper transcription tag */}
        {!isUser && transcription && (
          <div className="msg__transcription">
            🎙️ You said: <em>"{transcription}"</em>
          </div>
        )}

        {/* Content */}
        <div className={`msg__content ${hasUrdu ? "msg__content--bilingual" : ""}`}>
          <ReactMarkdown components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>

        {/* TTS Audio Player */}
        {audioUrl && (
          <div className="msg__audio">
            <AudioPlayer audioUrl={audioUrl} />
          </div>
        )}

        {/* Timestamp */}
        <div className="msg__meta">
          <span className="msg__time">{formatTime(timestamp)}</span>
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="msg__avatar msg__avatar--user">
          <IoPersonCircleOutline />
        </div>
      )}
    </div>
  );
}
