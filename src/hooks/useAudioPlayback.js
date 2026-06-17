import { useCallback, useRef } from "react";
import { pcmBase64ToFloat32, parseSampleRate } from "../utils/audioUtils.js";

/**
 * Turn-aware, gap-free audio playback queue via Web Audio API.
 *
 * Key design decisions:
 * 1. **Turn gating** – each call to `startNewTurn()` cancels any prior audio,
 *    preventing overlapping bot voices from different Gemini turns.
 * 2. **Seamless scheduling** – chunks are scheduled back-to-back on the
 *    Web Audio timeline WITHOUT per-chunk fading to avoid volume pumping.
 *    Only the very first chunk of a turn gets a tiny fade-in to prevent
 *    an initial click, and no fade-out between chunks.
 * 3. **Robust isPlaying()** – uses the scheduled end-time on the Web Audio
 *    clock rather than relying on `onended` callbacks (which can be missed
 *    if sources are stopped early).
 */

const START_BUFFER_SECONDS = 0.02;    // lower first-chunk latency for live speech
const MIN_SCHEDULE_AHEAD = 0.004;     // schedule new chunk if queue is nearly drained
const FADE_IN_SECONDS = 0.003;        // tiny fade-in on first chunk only

export function useAudioPlayback() {
  const ctxRef = useRef(null);
  const sourcesRef = useRef([]);         // active AudioBufferSourceNode references
  const nextTimeRef = useRef(0);         // next available slot on the timeline
  const playingRef = useRef(false);
  const turnIdRef = useRef(0);           // monotonic turn counter
  const chunkCountRef = useRef(0);       // chunks enqueued in current turn

  /* ── AudioContext (lazy singleton) ────────────────────────────── */
  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        // Request lower latency for smoother playback
        latencyHint: "interactive",
      });
    }
    return ctxRef.current;
  }, []);

  /* ── Stop everything & reset queue ────────────────────────────── */
  const stopAll = useCallback(() => {
    // Bump turn so any in-flight enqueue calls for the old turn are ignored
    turnIdRef.current += 1;
    nextTimeRef.current = 0;
    playingRef.current = false;
    chunkCountRef.current = 0;

    for (const src of sourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
      try { src.disconnect(); } catch { /* ok */ }
    }
    sourcesRef.current = [];
  }, []);

  /* ── Start a fresh audio turn (called on first audio of new Gemini turn) ── */
  const startNewTurn = useCallback(() => {
    stopAll();
    return turnIdRef.current;
  }, [stopAll]);

  /* ── Schedule one PCM chunk on the Web Audio timeline ─────────── */
  const scheduleChunk = useCallback(
    (float32, sampleRate, forTurnId) => {
      // Stale turn → drop silently
      if (forTurnId !== turnIdRef.current) return;

      // Skip empty or too-small buffers
      if (!float32 || float32.length < 2) return;

      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();

      const buffer = ctx.createBuffer(1, float32.length, sampleRate);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      sourcesRef.current.push(source);

      // Decide start time: if queue ran dry, add a small latency buffer
      const now = ctx.currentTime;
      const queueDrained = nextTimeRef.current <= now + MIN_SCHEDULE_AHEAD;
      const startAt = queueDrained
        ? now + START_BUFFER_SECONDS
        : nextTimeRef.current;

      const isFirstChunk = chunkCountRef.current === 0;
      chunkCountRef.current += 1;

      if (isFirstChunk) {
        // Only the very first chunk of a turn gets a tiny fade-in
        // to prevent an initial PCM click
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(1, startAt + FADE_IN_SECONDS);
      } else {
        // Interior chunks: constant volume — NO fade-in/fade-out
        // This prevents the "pumping" distortion between chunks
        gain.gain.setValueAtTime(1, startAt);
      }

      source.start(startAt);
      nextTimeRef.current = startAt + buffer.duration;
      playingRef.current = true;

      source.onended = () => {
        sourcesRef.current = sourcesRef.current.filter((s) => s !== source);
        try { gain.disconnect(); } catch { /* ok */ }
        // Only mark as not playing if nothing else is scheduled
        if (sourcesRef.current.length === 0) {
          playingRef.current = false;
        }
      };
    },
    [getCtx]
  );

  /* ── Public: enqueue a base64 PCM audio chunk ─────────────────── */
  const enqueueAudio = useCallback(
    (base64, mimeType = "audio/pcm;rate=24000", turnId) => {
      if (!base64) return;
      const rate = parseSampleRate(mimeType, 24000);
      const float32 = pcmBase64ToFloat32(base64);
      if (!float32 || float32.length === 0) return;
      // Use provided turnId or current turn
      scheduleChunk(float32, rate, turnId ?? turnIdRef.current);
    },
    [scheduleChunk]
  );

  /* ── Public: reliable playback status ─────────────────────────── */
  const isPlaying = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return false;
    // Check if there is still audio scheduled ahead on the timeline
    return nextTimeRef.current > ctx.currentTime + 0.04;
  }, []);

  return { enqueueAudio, stopAll, startNewTurn, isPlaying, getCtx };
}
