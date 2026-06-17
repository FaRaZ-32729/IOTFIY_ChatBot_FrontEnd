import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTimer } from "react-use-precision-timer";
import ImageSlideshow from "./ImageSlideshow.jsx";
import LeadForm from "./LeadForm.jsx";
import CardScanner from "./CardScanner.jsx";
import SpeakerAngle from "./SpeakerAngle.jsx";
import { useGeminiLive } from "../hooks/useGeminiLive.js";
import { useAudioPlayback } from "../hooks/useAudioPlayback.js";
import { useMicrophone } from "../hooks/useMicrophone.js";
import { usePassiveListener } from "../hooks/usePassiveListener.js";
import { saveLeadDetails } from "../services/api.js";
import "./VoiceSession.css";

const BARGE_IN_THRESHOLD = 0.3;
const BARGE_IN_FRAMES = 4;
const BARGE_IN_GRACE_MS = 900;
const INACTIVITY_TIMEOUT_MS = 10000; // 10 seconds of silence
const DETAILS_FLOW_PATTERN =
  /your details|contact details|give me your details|visiting card|business card|card up to the camera|hold your card|your name|company name|designation|phone number|email address|your email|information correct|did i get that right/i;

export default function VoiceSession() {
  const [mode, setMode] = useState("idle");

  // RAG-retrieved images shown in a horizontal carousel
  const [ragImages, setRagImages] = useState([]);
  const [syncIndex, setSyncIndex] = useState(null);

  const [leadMode, setLeadMode] = useState(false);
  const [leadFields, setLeadFields] = useState({ name: "", company: "", designation: "", phone: "", email: "" });
  const [activeLeadField, setActiveLeadField] = useState("name");
  const [leadSaving, setLeadSaving] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [statusText, setStatusText] = useState("Connect to start voice chat");
  const [detailCollectionMode, setDetailCollectionMode] = useState(false);

  // Camera/Card scanning states
  const [cameraActive, setCameraActive] = useState(false);
  const [awaitingCardScan, setAwaitingCardScan] = useState(false);

  // Inactivity timer ref
  const inactivityTimerRef = useRef(null);
  const inactivitySentRef = useRef(false);
  const bargeInFramesRef = useRef(0);
  const speakingStartedAtRef = useRef(0);
  const initialKeywordRef = useRef(null);

  // Track current audio turn to prevent overlapping voices
  const currentTurnIdRef = useRef(null);
  const isSpeakingThisTurnRef = useRef(false);

  const { enqueueAudio, stopAll, startNewTurn, isPlaying, getCtx } = useAudioPlayback();

  const handleInterrupted = useCallback(() => {
    stopAll();
    isSpeakingThisTurnRef.current = false;
    setMode("listening");
  }, [stopAll]);

  const connectTimeoutRef = useRef(null);

  // ── stopSession helper — defined early so handlers can reference it ──
  const stopSessionRef = useRef(null);

  // ── Inactivity reset — call whenever user speaks or bot speaks ──
  const resetInactivityTimer = useCallback(() => {
    inactivitySentRef.current = false;
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const sendInactivityCheckRef = useRef(null);

  const startInactivityTimer = useCallback(() => {
    resetInactivityTimer();
    if (cameraActive || awaitingCardScan || detailCollectionMode) return;
    inactivityTimerRef.current = setTimeout(() => {
      if (!inactivitySentRef.current) {
        inactivitySentRef.current = true;
        console.log("[VoiceSession] 10s inactivity — sending check");
        sendInactivityCheckRef.current?.();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [resetInactivityTimer, cameraActive, awaitingCardScan, detailCollectionMode]);

  const live = useGeminiLive({
    onOpen: () => {
      setStatusText("Connected — starting voice engine…");
    },
    onStatus: (status) => {
      if (status === "gemini_connected") {
        setStatusText("Voice engine online — almost ready…");
      }
    },
    onReady: () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      setStatusText("Listening… speak anytime");
      setMode("listening");
      // Start inactivity timer after session is ready
      startInactivityTimer();

      if (initialKeywordRef.current) {
        live.sendText(initialKeywordRef.current);
        initialKeywordRef.current = null;
      }
    },
    onAudio: (data, mimeType) => {
      // Start a new audio turn only once per Gemini turn
      if (!isSpeakingThisTurnRef.current) {
        isSpeakingThisTurnRef.current = true;
        const turnId = startNewTurn();
        currentTurnIdRef.current = turnId;
        setMode("speaking");
        speakingStartedAtRef.current = Date.now();
        bargeInFramesRef.current = 0;
      }
      // Enqueue with current turn ID — stale chunks from old turns are dropped
      enqueueAudio(data, mimeType, currentTurnIdRef.current);
      // Bot is speaking — reset inactivity
      resetInactivityTimer();
    },
    onInterrupted: handleInterrupted,
    onTranscript: (role, text) => {
      if (role === "assistant") {
        if (DETAILS_FLOW_PATTERN.test(text || "")) {
          setDetailCollectionMode(true);
          setRagImages([]);
          setSyncIndex(null);
        }
        // Check for camera activation trigger
        if (text.includes("[ACTIVATE_CAMERA]")) {
          setDetailCollectionMode(true);
          setRagImages([]);
          setSyncIndex(null);
          setCameraActive(true);
          setAwaitingCardScan(true);
          setMode("idle");
        }
      }
      if (role === "user") {
        // User spoke — reset inactivity timer
        resetInactivityTimer();
      }
    },
    // onImages: (payload, replace = false) => {
    //   if (leadMode || cameraActive || awaitingCardScan || detailCollectionMode) {
    //     console.log("[VoiceSession] Ignoring images during detail/card collection");
    //     return;
    //   }
    //   const list = Array.isArray(payload) ? payload : [];
    //   console.log("[VoiceSession] onImages received:", list.length, "images", list);
    //   if (replace) setSyncIndex(null);
    //   setRagImages((prev) => {
    //     if (replace) return list;
    //     const merged = [...(prev || []), ...list];
    //     const seen = new Set();
    //     return merged.filter((item) => {
    //       const key = typeof item === "string"
    //         ? item
    //         : item?.url || item?.image_path || "";
    //       if (!key || seen.has(key)) return false;
    //       seen.add(key);
    //       return true;
    //     });
    //   });
    // },

    onImages: (payload, replace = false) => {
      if (leadMode || cameraActive || awaitingCardScan || detailCollectionMode) {
        console.log("[VoiceSession] Ignoring images during detail/card collection");
        return;
      }

      let list = Array.isArray(payload) ? payload : [];

      console.log("🖼️ Raw images received from backend:", list);

      // ←←← Yeh zaroori hai
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://chatbotnd.iotfiysolutions.com";

      const fullImages = list.map(img => {
        if (typeof img === "string") {
          if (img.startsWith("http")) return img;   // already full url
          return `${backendUrl}${img.startsWith('/') ? '' : '/'}${img}`;
        }
        return img;
      });

      console.log("✅ Final Full Image URLs:", fullImages);

      if (replace) setSyncIndex(null);

      setRagImages((prev) => {
        if (replace) return fullImages;
        const merged = [...(prev || []), ...fullImages];
        return [...new Set(merged)];   // duplicates remove
      });
    },

    onImageSync: (imageId, timestamp) => {
      if (Number.isFinite(imageId)) {
        setSyncIndex(Math.max(imageId - 1, 0));
      }
    },
    onTurnComplete: () => {
      // Mark turn as finished so next audio starts a fresh turn
      isSpeakingThisTurnRef.current = false;
      if (!isPlaying()) setMode("listening");
      // After bot finishes speaking, start inactivity timer
      startInactivityTimer();
    },
    onShowLeadForm: (data) => {
      // Triggered when chatbot confirms user details — show the form
      console.log("[VoiceSession] Show lead form triggered by backend", data);
      setDetailCollectionMode(true);
      setRagImages([]);
      setSyncIndex(null);
      if (data) {
        setLeadFields(prev => ({
          ...prev,
          name: data.name || prev.name,
          company: data.company || prev.company,
          designation: data.designation || data.jobTitle || prev.designation,
          phone: data.phone || prev.phone,
          email: data.email || prev.email,
        }));
      }
      setLeadMode(true);
    },
    onLeadSaved: () => {
      setStatusText("Lead saved. Thank you! Ending session…");
      setLeadMode(false);
      resetInactivityTimer();
      setTimeout(() => {
        stopSessionRef.current?.();
      }, 2000);
    },
    onError: (msg) => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      setStatusText(msg || "Connection error");
      setSessionActive(false);
      setMode("idle");
      resetInactivityTimer();
    },
    onClose: () => {
      setSessionActive(false);
      setMode("idle");
      setStatusText("Disconnected");
      resetInactivityTimer();
    },
  });

  // Set up inactivity check sender ref
  useEffect(() => {
    sendInactivityCheckRef.current = () => {
      if (live.connected) {
        live.sendInactivityCheck();
      }
    };
  }, [live]);

  const sendAudioRef = useRef(live.sendAudio);
  sendAudioRef.current = live.sendAudio;
  const sendInterruptRef = useRef(live.sendInterrupt);
  sendInterruptRef.current = live.sendInterrupt;

  const onAudioChunk = useCallback((base64) => {
    sendAudioRef.current(base64);
  }, []);

  const onLevel = useCallback(
    (level) => {
      if (!sessionActive || mode !== "speaking") {
        bargeInFramesRef.current = 0;
        return;
      }

      const inGraceWindow =
        Date.now() - speakingStartedAtRef.current < BARGE_IN_GRACE_MS;

      if (!inGraceWindow && level > BARGE_IN_THRESHOLD) {
        bargeInFramesRef.current += 1;
      } else {
        bargeInFramesRef.current = 0;
      }

      if (bargeInFramesRef.current >= BARGE_IN_FRAMES) {
        bargeInFramesRef.current = 0;
        stopAll();
        isSpeakingThisTurnRef.current = false;
        sendInterruptRef.current();
        setMode("listening");
      }
    },
    [sessionActive, mode, stopAll]
  );

  const mic = useMicrophone(onAudioChunk, onLevel);

  // Handler for card scanner completion — auto-populate fields from structured data
  const handleCardScanned = useCallback((ocrText, structuredData) => {
    setDetailCollectionMode(true);
    setRagImages([]);
    setSyncIndex(null);
    setCameraActive(false);
    setAwaitingCardScan(false);

    // Auto-populate lead fields from structured card data if available
    if (structuredData) {
      const extractedName = [structuredData.firstName, structuredData.lastName]
        .filter(Boolean).join(" ").trim() || structuredData.fullName || "";

      setLeadFields(prev => ({
        ...prev,
        name: extractedName || prev.name,
        company: structuredData.company || prev.company,
        designation: structuredData.designation || structuredData.jobTitle || prev.designation,
        phone: structuredData.phone || prev.phone,
        email: structuredData.email || prev.email,
      }));

      // Show the form immediately with extracted data
      setLeadMode(true);
      console.log("[VoiceSession] Card data auto-populated:", {
        name: extractedName,
        company: structuredData.company,
        designation: structuredData.designation || structuredData.jobTitle,
        phone: structuredData.phone,
        email: structuredData.email,
      });
    }

    // Also send the structured text to Gemini for confirmation
    if (live.sendText) {
      const payloadText = `[CARD_SCANNED]
Raw Text:
${ocrText || "N/A"}

Extracted Data:
Name: ${structuredData?.fullName || [structuredData?.firstName, structuredData?.lastName].filter(Boolean).join(" ") || ""}
Company: ${structuredData?.company || ""}
Designation: ${structuredData?.designation || structuredData?.jobTitle || ""}
Phone: ${structuredData?.phone || ""}
Email: ${structuredData?.email || ""}`;

      live.sendText(payloadText);
    }
    setMode("listening");
  }, [live]);

  const handleCameraCancel = useCallback(() => {
    setDetailCollectionMode(true);
    setRagImages([]);
    setSyncIndex(null);
    setCameraActive(false);
    setAwaitingCardScan(false);
    setMode("listening");
  }, []);

  // Manual "Show Form" button handler
  const handleShowForm = useCallback(() => {
    setDetailCollectionMode(true);
    setRagImages([]);
    setSyncIndex(null);
    setLeadMode(true);
  }, []);

  const handleSaveLead = useCallback(async () => {
    const payload = {
      name: leadFields.name?.trim() || "",
      company: leadFields.company?.trim() || "",
      designation: leadFields.designation?.trim() || "",
      phone: leadFields.phone?.trim() || "",
      email: leadFields.email?.trim() || "",
      sessionId: live.sessionId,
    };

    if (leadSaving) return;

    if (!payload.name || !payload.phone || !payload.email) {
      setStatusText("Name, Phone, and Email are required.");
      return;
    }

    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      setStatusText("Please enter a valid email address.");
      return;
    }

    try {
      setLeadSaving(true);
      setStatusText("Saving lead details...");
      await saveLeadDetails(payload);
      setStatusText("Lead saved. Thank you! Ending session...");
      setLeadMode(false);
      resetInactivityTimer();
      setTimeout(() => {
        stopSessionRef.current?.();
      }, 1200);
    } catch (err) {
      setStatusText(err?.message || "Could not save details. Please try again.");
    } finally {
      setLeadSaving(false);
    }
  }, [leadFields, leadSaving, live.sessionId, resetInactivityTimer]);

  const playbackTick = useCallback(() => {
    if (sessionActive && mode === "speaking" && !isPlaying()) {
      setMode("listening");
    }
  }, [sessionActive, mode, isPlaying]);

  const playbackTimer = useTimer({ delay: 80 }, playbackTick);

  useEffect(() => {
    if (sessionActive) playbackTimer.start();
    else playbackTimer.stop();
    return () => playbackTimer.stop();
  }, [sessionActive]);

  // ── Decide what to show ───────────────────────────────────────
  const displayImages = ragImages;
  const hasImages = displayImages.length > 0;

  // Keep retrieved visuals full-screen for the whole live session.
  const suppressImages =
    detailCollectionMode || leadMode || cameraActive || awaitingCardScan;
  const showCarousel = sessionActive && hasImages && !suppressImages;

  const startSession = useCallback(async (matchedKeyword) => {
    if (sessionActive) return;
    initialKeywordRef.current = typeof matchedKeyword === "string" ? matchedKeyword : null;

    try {
      setStatusText("Connecting…");
      setSessionActive(true);
      const audioCtx = getCtx();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      live.connect();

      connectTimeoutRef.current = setTimeout(() => {
        setStatusText(
          "Connection timed out. Is the backend running on port 5000?"
        );
        setSessionActive(false);
        setMode("idle");
        live.disconnect();
        mic.stop();
      }, 25000);

      await mic.start();
    } catch (err) {
      setStatusText(
        err?.message || "Microphone access denied. Allow mic and try again."
      );
      setSessionActive(false);
      live.disconnect();
    }
  }, [live, mic, sessionActive, getCtx]);

  usePassiveListener({
    keywords: ["assalam", "salam", "salaam", "alaikum", "alaykum", "walaikum", "hi", "hello", "hey", "gravitas"],
    enabled: !sessionActive,
    onDetected: (matchedKeyword) => startSession(matchedKeyword),
  });

  const stopSession = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    resetInactivityTimer();
    mic.stop();
    live.disconnect();
    stopAll();
    isSpeakingThisTurnRef.current = false;
    setSessionActive(false);
    setMode("idle");
    setRagImages([]);
    setSyncIndex(null);
    setLeadMode(false);
    setDetailCollectionMode(false);
    setCameraActive(false);
    setAwaitingCardScan(false);
    setLeadFields({ name: "", company: "", designation: "", phone: "", email: "" });
    setStatusText("Session ended");
  }, [mic, live, stopAll, resetInactivityTimer]);

  // Keep a ref so onLeadSaved can call stopSession without stale closure
  stopSessionRef.current = stopSession;

  useEffect(() => {
    if (!sessionActive) return undefined;
    return () => {
      mic.stop();
      stopAll();
      resetInactivityTimer();
    };
  }, [sessionActive]);

  return (
    <div
      className={`voice-session${sessionActive ? " voice-session--active" : ""}`}
      id="voice-session"
    >
      {/* ── Related image carousel — visible while the assistant is speaking ── */}
      {showCarousel && (
        <div className="voice-session__carousel">
          <ImageSlideshow
            images={displayImages}
            intervalMs={4000}
            fullScreen={true}
            syncIndex={syncIndex}
            enableModal={false}
          />
        </div>
      )}

      {/* ── Initial Idle Logo ── */}
      {!sessionActive && (
        <div className="voice-session__idle-logo-container">
          <img src="/IOTFIY.jpeg" alt="IOTFIY Logo" className="voice-session__idle-logo" />
        </div>
      )}

      <span className="voice-session__sr-status" aria-live="polite">
        {statusText}
      </span>

      {/* ── Session controls overlay (End Session + Show Form buttons) ── */}
      {sessionActive && (
        <div className="voice-session__overlay" aria-live="polite">
          {!leadMode && (
            <button
              type="button"
              className="voice-session__btn voice-session__btn--form"
              onClick={handleShowForm}
              id="show-form-btn"
              title="Open contact form"
            >
              📋 Show Form
            </button>
          )}
          <button
            type="button"
            className="voice-session__btn voice-session__btn--danger"
            onClick={stopSession}
            id="stop-voice-btn"
          >
            End Session
          </button>
        </div>
      )}

      <LeadForm
        visible={leadMode}
        fields={leadFields}
        activeField={activeLeadField}
        onFieldChange={(key, val) =>
          setLeadFields((f) => ({ ...f, [key]: val }))
        }
        onSubmitText={(text) => live.sendText(text)}
        onSave={handleSaveLead}
        saving={leadSaving}
        onClose={() => setLeadMode(false)}
      />

      {/* Card Scanner Component */}
      {cameraActive && (
        <CardScanner
          onCardScanned={handleCardScanned}
          onCancel={handleCameraCancel}
        />
      )}

      {/* Speaker Angle Detection */}
      <SpeakerAngle isActive={!cameraActive && !awaitingCardScan} />
    </div>
  );
}
