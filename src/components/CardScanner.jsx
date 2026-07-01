import React, { useEffect, useRef, useState, useCallback } from "react";
import { scanBusinessCard } from "../services/api.js";
import "./CardScanner.css";

// Auto-capture delay (ms) after camera focus stabilises
const AUTO_CAPTURE_DELAY = 5000;

// CardScanner.jsx ke top par, component se bahar ek helper add karo
function normalizeToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((v) => String(v).trim()).filter(Boolean))];
  }
  // Mindee kabhi "03001234567, 03009876543" jaisa bhi bhej sakta hai
  return [
    ...new Set(
      String(value)
        .split(/[,;]|(?:\s+and\s+)/i)
        .map((v) => v.trim())
        .filter(Boolean)
    ),
  ];
}

export default function CardScanner({ onCardScanned, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const autoTimerRef = useRef(null);

  const [status, setStatus] = useState("Initializing camera...");
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [mirrorCamera, setMirrorCamera] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [countdown, setCountdown] = useState(null);

  // ── Camera bootstrap ──────────────────────────────────────────
  const startCamera = useCallback(async () => {
    // Stop any previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setScanResult(null);
    setCapturedPreview(null);
    setIsProcessing(false);
    setStatus("Requesting camera access...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // rear camera preferred
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => { });
          setStreamActive(true);
          setStatus("Camera ready — align the card and wait for auto-capture, or tap Capture Now.");
          scheduleAutoCapture();
        };
      }
    } catch (err) {
      setStatus(`Camera error: ${err?.message || "Access denied"}. Please allow camera access.`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Schedule auto-capture countdown ──────────────────────────
  const scheduleAutoCapture = useCallback(() => {
    clearTimeout(autoTimerRef.current);

    let remaining = Math.ceil(AUTO_CAPTURE_DELAY / 1000);
    setCountdown(remaining);

    const tick = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        setCountdown(null);
        captureAndProcess();
      }
    }, 1000);

    // Store interval id so we can cancel on manual capture
    autoTimerRef.current = tick;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startCamera();
    return () => {
      clearTimeout(autoTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop video stream ─────────────────────────────────────────
  const stopStream = useCallback(() => {
    clearTimeout(autoTimerRef.current);
    setCountdown(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreamActive(false);
  }, []);

  // ── Capture frame → OCR ───────────────────────────────────────
  const captureAndProcess = useCallback(async () => {
    // Cancel any pending auto-capture tick
    clearTimeout(autoTimerRef.current);
    setCountdown(null);

    const video = videoRef.current;
    if (!video) return;

    setIsProcessing(true);
    setStatus("Capturing image...");

    // Ensure we have valid frame dimensions
    if (!(video.videoWidth > 50 && video.videoHeight > 30)) {
      await new Promise((r) => setTimeout(r, 400));
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    if (mirrorCamera) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPreview(imageDataUrl);
    stopStream();

    setStatus("Sending to Mindee OCR...");

    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const result = await scanBusinessCard(blob);

      setIsProcessing(false);

      const displayText =
        result?.displayText || result?.text || result?.summary || "";

      if (displayText && displayText.trim().length > 0) {
        setStatus("Card scanned successfully! Sending to Gravitas...");

        // Give the user a moment to see the success message
        setTimeout(() => {
          const structuredData = {
            firstName: result.firstName || "",
            lastName: result.lastName || "",
            fullName: result.fullName || "",
            phone: normalizeToArray(result.phone),     // 👈 ab array
            email: normalizeToArray(result.email),
            company: result.company || "",
            designation: result.designation || result.jobTitle || "",
            address: result.address || "",
            jobTitle: result.jobTitle || "",
          };
          onCardScanned(displayText, structuredData);
        }, 1500);
      } else {
        setScanResult(null);
        setStatus(
          "No data extracted. Restarting camera..."
        );
        setTimeout(() => {
          startCamera();
        }, 2000);
      }
    } catch (err) {
      console.error("Card scan error:", err);
      setIsProcessing(false);
      setScanResult(null);
      setStatus(`OCR error: ${err?.message || "Unknown error"}. Restarting...`);
      setTimeout(() => {
        startCamera();
      }, 2000);
    }
  }, [mirrorCamera, stopStream, onCardScanned, startCamera]);

  // ── Retry ─────────────────────────────────────────────────────
  const handleRetry = useCallback(async () => {
    setScanResult(null);
    setCapturedPreview(null);
    setStatus("Restarting camera...");
    await startCamera();
  }, [startCamera]);

  return (
    <div className="card-scanner" role="dialog" aria-label="Business Card Scanner">
      <div className="card-scanner__container">
        <h2 className="card-scanner__title">📇 Scan Your Visiting Card</h2>

        {/* ── Camera preview ── */}
        <div className="card-scanner__preview">
          {/* Live video */}
          {!capturedPreview && (
            <video
              ref={videoRef}
              className="card-scanner__video"
              playsInline
              autoPlay
              muted
              style={{ transform: mirrorCamera ? "scaleX(-1)" : "scaleX(1)" }}
            />
          )}

          {/* Captured image preview */}
          {capturedPreview && (
            <img
              src={capturedPreview}
              alt="Captured card"
              className="card-scanner__captured"
            />
          )}

          {/* Card alignment guide overlay */}
          {!capturedPreview && streamActive && (
            <div className="card-scanner__guide">
              <div className="card-scanner__guide-rect" />
              {countdown !== null && (
                <div className="card-scanner__countdown">
                  Auto-capture in {countdown}s
                </div>
              )}
            </div>
          )}

          {/* Processing spinner */}
          {isProcessing && (
            <div className="card-scanner__spinner-overlay">
              <div className="card-scanner__spinner" />
              <span>Processing…</span>
            </div>
          )}

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        {/* ── Status ── */}
        <p className="card-scanner__status">{status}</p>

        {/* ── Extracted results ── */}
        {scanResult && (
          <div className="card-scanner__result">
            <h3>Extracted Card Data</h3>
            {scanResult.fields?.length > 0 ? (
              <div className="card-scanner__fields">
                {scanResult.fields.map((field) => (
                  <div key={field.key} className="card-scanner__field-row">
                    <span className="card-scanner__field-label">{field.label}</span>
                    <span className="card-scanner__field-value">
                      {Array.isArray(field.value) ? field.value.join(", ") : field.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="card-scanner__text">{scanResult.displayText}</pre>
            )}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="card-scanner__actions">
          {/* Manual capture — only show if camera is live & not processing */}
          {streamActive && !isProcessing && !scanResult && (
            <button
              className="card-scanner__btn card-scanner__btn--capture"
              onClick={captureAndProcess}
              id="capture-card-btn"
            >
              📸 Capture Now
            </button>
          )}

          {/* Mirror toggle */}
          {streamActive && !isProcessing && (
            <button
              className="card-scanner__btn card-scanner__btn--mirror"
              onClick={() => setMirrorCamera((m) => !m)}
            >
              {mirrorCamera ? "🔄 Mirror: ON" : "🔄 Mirror: OFF"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
