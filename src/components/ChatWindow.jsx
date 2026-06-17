import React, { useState, useRef, useEffect, useCallback } from "react";
import { IoSend } from "react-icons/io5";
import { HiOutlineSparkles } from "react-icons/hi2";
import MessageBubble from "./MessageBubble.jsx";
import AudioRecorder from "./AudioRecorder.jsx";
import TypingIndicator from "./TypingIndicator.jsx";
import { sendTextMessage, sendVoiceMessage } from "../services/api.js";
import {
  base64ToAudioUrl,
  generateSessionId,
} from "../utils/helpers.js";
import "./ChatWindow.css";

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "### 👋 Welcome to IoTFIY Chatbot!\n\n" +
    "I'm the official AI assistant for **IoTFIY**. I can answer questions using the **Nucleus Distribution** profile, the **Mushaba Rag** document, the **IOTFIY Solutions Document**, and the **Nucleus Vericom** document.\n\n" +
    "**Products and solutions I can explain:** IOTFIY Gateway, IOTFIY Dashboard and widgets, IOTFIY Sales Hub, Mall Washroom IoT Monitoring, Gas Detection and Suppression Automation, IOTFIY AC-Kit, Mushaba, Enterprise Private Social Network, EASY Solar, PackTrack AI, Learning Management System, PoleKit, 3D AI Chatbot Experiences, Enterprise Event Platforms, GameNest Monitoring, Weather Monitoring, Face Recognition Systems, Smart Ventilator Control, WallHub Power2GO, Cold Storage Monitoring, Hardware and PCB Design, AI Support Chatbots, AI Computer Vision Systems, Nucleus Distribution, and Vericom data center solutions.\n\n" +
    "Ask about services, solutions, or anything inside those PDFs. Type your question or tap the 🎤 microphone to speak — I understand both **English** and **اردو**!",
  timestamp: new Date().toISOString(),
};

export default function ChatWindow() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    const saved = sessionStorage.getItem("iotfiy_session");
    return saved || generateSessionId();
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* Persist session id */
  useEffect(() => {
    sessionStorage.setItem("iotfiy_session", sessionId);
  }, [sessionId]);

  /* Auto-scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ────── Send Text ────── */
  const handleSendText = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendTextMessage(text, sessionId);
      if (res.sessionId) setSessionId(res.sessionId);

      const botMsg = {
        role: "assistant",
        content: res.textResponse,
        audioUrl: res.audioBase64
          ? base64ToAudioUrl(res.audioBase64)
          : null,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Text chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Sorry, something went wrong. Please try again.\n\n`" +
            (err?.response?.data?.error || err.message) +
            "`",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, sessionId]);

  /* ────── Send Voice ────── */
  const handleVoiceComplete = useCallback(
    async (audioBlob) => {
      if (loading) return;

      const userMsg = {
        role: "user",
        content: "🎤 *Voice message sent…*",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await sendVoiceMessage(audioBlob, sessionId);
        if (res.sessionId) setSessionId(res.sessionId);

        /* Update user message with actual transcription */
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated.length - 1;
          // Find the last user message
          for (let i = last; i >= 0; i--) {
            if (
              updated[i].role === "user" &&
              updated[i].content.includes("Voice message sent")
            ) {
              updated[i] = {
                ...updated[i],
                content: res.transcription || "🎤 *(transcription unavailable)*",
              };
              break;
            }
          }
          return updated;
        });

        const botMsg = {
          role: "assistant",
          content: res.textResponse,
          audioUrl: res.audioBase64
            ? base64ToAudioUrl(res.audioBase64)
            : null,
          transcription: res.transcription,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch (err) {
        console.error("Voice chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "⚠️ Voice processing failed. Please try again.\n\n`" +
              (err?.response?.data?.error || err.message) +
              "`",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId]
  );

  /* ────── Key handler ────── */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="chatwin" id="chat-window">
      {/* ── Messages Area ── */}
      <div className="chatwin__messages" id="messages-container">
        <div className="chatwin__messages-inner">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              role={msg.role}
              content={msg.content}
              audioUrl={msg.audioUrl}
              timestamp={msg.timestamp}
              transcription={msg.transcription}
            />
          ))}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input Bar ── */}
      <div className="chatwin__input-bar glass" id="input-bar">
        <div className="chatwin__input-wrap">
          {/* <HiOutlineSparkles className="chatwin__input-icon" /> */}
          <textarea
            ref={inputRef}
            className="chatwin__input"
            placeholder="Ask about IoTFIY, Nucleus, or Mushaba…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
            id="chat-input"
          />
        </div>

        <div className="chatwin__actions">
          <AudioRecorder
            onRecordingComplete={handleVoiceComplete}
            disabled={loading}
          />

          <button
            className="chatwin__send-btn"
            onClick={handleSendText}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            id="send-button"
          >
            <IoSend />
          </button>
        </div>
      </div>
    </div>
  );
}
