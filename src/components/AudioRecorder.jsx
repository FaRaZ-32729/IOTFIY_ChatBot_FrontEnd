import React, { useState, useRef, useCallback, useEffect } from "react";
import { HiMicrophone, HiStop } from "react-icons/hi2";
import "./AudioRecorder.css";

/**
 * AudioRecorder
 * Captures microphone audio and returns a Blob when stopped.
 *
 * Props:
 *   onRecordingComplete(blob)  — called with the recorded audio blob
 *   disabled                   — disables the button
 */
export default function AudioRecorder({ onRecordingComplete, disabled }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      /* Prefer webm/opus, fall back to whatever the browser supports */
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        onRecordingComplete?.(blob);
        clearInterval(timerRef.current);
        setElapsed(0);

        /* Release mic */
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start(250); // collect data every 250ms
      setRecording(true);

      /* Elapsed timer */
      const t0 = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - t0) / 1000));
      }, 500);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone access to use voice input.");
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="audio-recorder" id="audio-recorder">
      {recording && (
        <div className="audio-recorder__status">
          <span className="audio-recorder__live-dot" />
          <span className="audio-recorder__timer">{fmtTime(elapsed)}</span>
        </div>
      )}

      <button
        className={`audio-recorder__btn ${recording ? "audio-recorder__btn--recording" : ""}`}
        onClick={recording ? stopRecording : startRecording}
        disabled={disabled}
        aria-label={recording ? "Stop recording" : "Start recording"}
        id="mic-button"
      >
        {recording ? <HiStop /> : <HiMicrophone />}

        {/* Ripple rings while recording */}
        {recording && (
          <>
            <span className="audio-recorder__ripple" />
            <span className="audio-recorder__ripple audio-recorder__ripple--delay" />
          </>
        )}
      </button>
    </div>
  );
}
