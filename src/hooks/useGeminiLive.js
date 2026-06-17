import { useCallback, useEffect, useRef, useState } from "react";
import { generateSessionId } from "../utils/helpers.js";

function getWsUrl(sessionId) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = import.meta.env.VITE_WS_HOST || window.location.host;
  return `${proto}://${host}/live?sessionId=${encodeURIComponent(sessionId)}`;
}

export function useGeminiLive(handlers = {}) {
  const wsRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const pendingAudioRef = useRef([]);
  const sessionIdRef = useRef(
    sessionStorage.getItem("iotfiy_live_session") || generateSessionId()
  );

  const sendAudioPayload = useCallback((base64) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;

    ws.send(
      JSON.stringify({
        type: "audio",
        data: base64,
        mimeType: "audio/pcm;rate=16000",
      })
    );
    return true;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(getWsUrl(sessionIdRef.current));
    wsRef.current = ws;

    // Capture logs for debugging
    if (!window.__wsLogs) window.__wsLogs = [];
    window.__wsLogs.push(`[${new Date().toISOString()}] Attempting connection to ${getWsUrl(sessionIdRef.current)}`);

    ws.onopen = () => {
      window.__wsLogs.push(`[${new Date().toISOString()}] [useGeminiLive] WebSocket opened`);
      console.log("[useGeminiLive] WebSocket opened");
      setConnected(true);
      handlersRef.current.onOpen?.();
    };

    ws.onmessage = (evt) => {
      try {
        // Sniff raw incoming data for hidden image markers too
        try {
          const raw = typeof evt.data === "string" ? evt.data : "";
          const rawMatch = raw.match(/\[\[SHOW_IMAGE:(\d+)\]\]/);
          if (rawMatch) {
            const imgId = parseInt(rawMatch[1], 10);
            handlersRef.current.onImageSync?.(imgId, Date.now());
          }
        } catch (e) {
          /* non-fatal */
        }

        const msg = JSON.parse(evt.data);
        window.__wsLogs.push(`[${new Date().toISOString()}] [useGeminiLive] Message: ${msg.type} - ${JSON.stringify(msg).substring(0, 100)}`);
        console.log("[useGeminiLive] Message received:", msg.type, msg);
        const h = handlersRef.current;
        switch (msg.type) {
          case "ready":
            window.__wsLogs.push(`[${new Date().toISOString()}] READY MESSAGE RECEIVED!`);
            console.log("[useGeminiLive] Received READY message");
            readyRef.current = true;
            setReady(true);
            const pending = pendingAudioRef.current;
            pendingAudioRef.current = [];
            for (const chunk of pending) {
              sendAudioPayload(chunk);
            }
            h.onReady?.();
            break;
          case "audio":
            h.onAudio?.(msg.data, msg.mimeType);
            break;
          case "interrupted":
            h.onInterrupted?.();
            break;
          case "transcript":
            h.onTranscript?.(msg.role, msg.text, msg.imageId);
            break;
          case "image_sync":
            // Handle image sync from hidden markers in Gemini output
            h.onImageSync?.(msg.imageId, msg.timestamp);
            break;
          case "images": {
            const payload = Array.isArray(msg.images) && msg.images.length
              ? msg.images
              : msg.urls;
            h.onImages?.(payload, msg.replace === true);
            break;
          }
          case "turn_complete":
            h.onTurnComplete?.();
            break;
          case "show_lead_form":
            h.onShowLeadForm?.(msg.data);
            break;
          case "lead_saved":
            h.onLeadSaved?.(msg.lead);
            break;
          case "error":
            h.onError?.(msg.message);
            break;
          case "status":
            if (msg.status === "gemini_connected") {
              h.onStatus?.("gemini_connected");
            }
            break;
          default:
            break;
        }
      } catch (err) {
        window.__wsLogs.push(`[${new Date().toISOString()}] [useGeminiLive] Parse error: ${err.message}`);
        console.error("WS parse error", err);
      }
    };

    ws.onclose = () => {
      window.__wsLogs.push(`[${new Date().toISOString()}] [useGeminiLive] WebSocket closed`);
      console.log("[useGeminiLive] WebSocket closed");
      setConnected(false);
      setReady(false);
      readyRef.current = false;
      handlersRef.current.onClose?.();
    };

    ws.onerror = () => {
      window.__wsLogs.push(`[${new Date().toISOString()}] [useGeminiLive] WebSocket error`);
      console.error("[useGeminiLive] WebSocket error");
      handlersRef.current.onError?.("WebSocket connection failed");
    };
  }, [sendAudioPayload]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    pendingAudioRef.current = [];
    setConnected(false);
    setReady(false);
    readyRef.current = false;
  }, []);

  const sendAudio = useCallback((base64) => {
    if (!base64) return;

    if (readyRef.current) {
      sendAudioPayload(base64);
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      pendingAudioRef.current.push(base64);
      if (pendingAudioRef.current.length > 40) {
        pendingAudioRef.current.shift();
      }
    }
  }, [sendAudioPayload]);

  const sendText = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text", text }));
    }
  }, []);

  const sendInterrupt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }
  }, []);

  const sendInactivityCheck = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "inactivity_check" }));
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("iotfiy_live_session", sessionIdRef.current);
    return () => disconnect();
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendAudio,
    sendText,
    sendInterrupt,
    sendInactivityCheck,
    connected,
    ready,
    sessionId: sessionIdRef.current,
  };
}
